import { ASCEND_PAGE_DELAY_MS, fetchAscendPage, toLocalExercise } from './ascend'
import { db } from './db'
import { seedIfEmpty } from './seeds'
import type { Exercise, MetaRow } from './types'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Sincroniza a biblioteca local com o catálogo da AscendAPI.
 *
 * Regras:
 * - O `ascendId` é estável; o `id` local é preservado para não quebrar
 *   rotinas/sessões que já apontam para o exercício.
 * - Os GIFs rotacionam semanalmente, então re-sincronizamos antes de 7 dias.
 * - A sincronização é retomável: cada página é gravada e o cursor salvo, então
 *   cair a rede no meio não recomeça tudo.
 * - NUNCA removemos exercícios de quem já tem dados. A lista de exemplo semeada
 *   só é limpa em instalação nova (sem rotinas, sem treinos e sem exercício
 *   criado por você), quando ela é 100% substituída pela Ascend.
 */
const META_ID = 'ascend-sync'
const STALE_MS = 6 * 24 * 60 * 60 * 1000 // < 7 dias (rotação de mídia)

interface AscendMeta extends MetaRow {
  count: number
  total: number
  done: boolean
  cursor?: string
}

export interface AscendProgress {
  running: boolean
  loaded: number
  total: number
}

let progress: AscendProgress | null = null
const listeners = new Set<() => void>()

export function subscribeAscendProgress(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getAscendProgress(): AscendProgress | null {
  return progress
}

function setProgress(p: AscendProgress | null) {
  progress = p
  for (const fn of listeners) fn()
}

export async function getAscendState(): Promise<AscendMeta | null> {
  const row = await db.meta.get(META_ID)
  return row ? (row as AscendMeta) : null
}

/** Precisa sincronizar? Nunca sincronizou, ficou no meio ou passou de 6 dias. */
export async function isAscendStale(): Promise<boolean> {
  const state = await getAscendState()
  if (!state || state.done === false) return true
  return Date.now() - state.at > STALE_MS
}

let syncPromise: Promise<void> | null = null

/** Dispara a sincronização. Chamadas concorrentes compartilham a mesma promise. */
export function syncAscendLibrary(): Promise<void> {
  if (!syncPromise) {
    syncPromise = runSync().finally(() => {
      syncPromise = null
    })
  }
  return syncPromise
}

async function runSync(): Promise<void> {
  const now = Date.now()
  const existing = await db.exercises.toArray()
  const byAscendId = new Map<string, Exercise>(
    existing.filter((e) => e.ascendId).map((e) => [e.ascendId as string, e]),
  )

  // Se a última tentativa ficou incompleta, retoma do cursor salvo.
  const state = await getAscendState()
  const resume = !!state && state.done === false
  let after = resume ? state?.cursor : undefined
  let total = resume ? (state?.total ?? 0) : 0

  setProgress({ running: true, loaded: byAscendId.size, total })
  try {
    do {
      const page = await fetchAscendPage(after)
      total = page.total

      const records = page.data.map((ex) => {
        const fresh = toLocalExercise(ex, now)
        const prev = byAscendId.get(ex.exerciseId)
        // Mesmo id/createdAt para preservar referências de rotinas e sessões.
        return prev ? { ...fresh, id: prev.id, createdAt: prev.createdAt } : fresh
      })
      await db.exercises.bulkPut(records)
      for (const r of records) if (r.ascendId) byAscendId.set(r.ascendId, r)

      after = page.next
      const meta: AscendMeta = { id: META_ID, at: Date.now(), count: byAscendId.size, total, done: !after, cursor: after }
      await db.meta.put(meta)
      setProgress({ running: true, loaded: byAscendId.size, total })
      if (after) await delay(ASCEND_PAGE_DELAY_MS)
    } while (after)

    await removeSeededExamples()
  } finally {
    setProgress(null)
  }
}

/**
 * Limpa a lista de exemplo semeada, mas SÓ em instalação nova. Se existir
 * qualquer rotina, treino ou exercício criado pelo usuário, não toca em nada —
 * a biblioteca antiga é preservada (com ou sem uso).
 */
async function removeSeededExamples(): Promise<void> {
  const [exercises, routines, sessions] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.sessions.toArray(),
  ])
  const hasUserData = routines.length > 0 || sessions.length > 0 || exercises.some((e) => !e.builtin)
  if (hasUserData) return

  const toDelete = exercises.filter((e) => e.builtin && e.source !== 'ascend').map((e) => e.id)
  if (toDelete.length > 0) await db.exercises.bulkDelete(toDelete)
}

/**
 * Boot: garante um catálogo utilizável mesmo offline (fallback semeado) e
 * sincroniza a Ascend em segundo plano quando estiver desatualizado.
 */
export async function bootstrapLibrary(): Promise<void> {
  await seedIfEmpty()
  if (await isAscendStale()) {
    // Não bloqueia o boot: sincroniza em segundo plano.
    void syncAscendLibrary().catch(() => {
      // Offline ou API fora: segue com o fallback local.
    })
  }
}

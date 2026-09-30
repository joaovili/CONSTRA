import { catalogEntryToLocal, type AscendCatalogEntry } from './ascend'
import { db } from './db'
import type { MetaRow } from './types'

/**
 * Carrega o catálogo Ascend empacotado no app (`public/ascend-catalog.json`)
 * para a biblioteca local. Nada é baixado da internet: a lista vem junto com o
 * app e o service worker a mantém em cache. Só os GIFs são buscados depois, ao
 * abrir cada exercício (`ExerciseInfo`).
 */
const META_ID = 'ascend-catalog'
// Bumpe ao trocar o JSON para recarregar a base.
const CATALOG_VERSION = '2026-09-30'
const CATALOG_URL = `${import.meta.env.BASE_URL}ascend-catalog.json`

interface CatalogMeta extends MetaRow {
  version: string
  count: number
}

let loadPromise: Promise<void> | null = null

/** Boot: garante a base Ascend na biblioteca local. Idempotente por versão. */
export function bootstrapLibrary(): Promise<void> {
  if (!loadPromise) {
    loadPromise = run().catch((err) => {
      loadPromise = null
      throw err
    })
  }
  return loadPromise
}

async function run(): Promise<void> {
  const meta = (await db.meta.get(META_ID)) as CatalogMeta | undefined
  if (meta?.version === CATALOG_VERSION) return

  const res = await fetch(CATALOG_URL)
  if (!res.ok) throw new Error(`Catálogo Ascend ${res.status}`)
  const entries = (await res.json()) as AscendCatalogEntry[]

  const now = Date.now()
  const existing = await db.exercises.toArray()
  const byAscendId = new Map(existing.filter((e) => e.ascendId).map((e) => [e.ascendId as string, e]))

  const records = entries.map((entry) => {
    const prev = byAscendId.get(entry.exerciseId)
    // Preserva id/createdAt para não quebrar rotinas/sessões existentes.
    return catalogEntryToLocal(entry, prev?.createdAt ?? now, prev?.id)
  })

  await db.transaction('rw', [db.exercises, db.meta], async () => {
    await db.exercises.bulkPut(records)
    const row: CatalogMeta = { id: META_ID, version: CATALOG_VERSION, count: records.length, at: now }
    await db.meta.put(row)
  })
}

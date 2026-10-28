import { catalogEntryToLocal, type AscendCatalogEntry } from './ascend'
import { db } from './db'
import type { MetaRow } from './types'

/**
 * Carrega o catálogo Ascend empacotado no app (`public/ascend-catalog.json`)
 * para a biblioteca local, com nomes/instruções em pt-BR (`ascend-pt.json`) e
 * GIFs de 360p do espelho Gymvisual (`ascend-gifs.json`). Nada é baixado da
 * internet: os três arquivos vêm junto com o app e o service worker os cacheia.
 */
const META_ID = 'ascend-catalog'
// Bumpe ao trocar qualquer um dos JSONs para recarregar a base.
const CATALOG_VERSION = '2026-10-28'
const BASE = import.meta.env.BASE_URL

interface CatalogMeta extends MetaRow {
  version: string
  count: number
}

interface PtCatalog {
  version: string
  names: Record<string, string>
  steps: Record<string, string>
}

interface GifCatalog {
  version: string
  gifs: Record<string, string>
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

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}${file}`)
  if (!res.ok) throw new Error(`${file} ${res.status}`)
  return (await res.json()) as T
}

async function run(): Promise<void> {
  const meta = (await db.meta.get(META_ID)) as CatalogMeta | undefined
  if (meta?.version === CATALOG_VERSION) return

  const [entries, pt, gifCatalog] = await Promise.all([
    fetchJson<AscendCatalogEntry[]>('ascend-catalog.json'),
    fetchJson<PtCatalog>('ascend-pt.json'),
    fetchJson<GifCatalog>('ascend-gifs.json'),
  ])

  const now = Date.now()
  const existing = await db.exercises.toArray()
  const byAscendId = new Map(existing.filter((e) => e.ascendId).map((e) => [e.ascendId as string, e]))

  const records = entries.map((entry) => {
    const prev = byAscendId.get(entry.exerciseId)
    // Preserva id/createdAt para não quebrar rotinas/sessões existentes.
    return catalogEntryToLocal(entry, prev?.createdAt ?? now, prev?.id, {
      name: pt.names[entry.name],
      instructions: entry.instructions.map((step) => pt.steps[step] ?? step),
      gifUrl: gifCatalog.gifs[entry.exerciseId],
      // Mantém o 180p já cacheado para não ficar sem GIF offline. Registros
      // antigos tinham gifUrl sem gifSource — nessa versão, todo gif era Ascend.
      gifUrlFallback:
        prev?.gifSource === 'ascend' || (!prev?.gifSource && prev?.gifUrl)
          ? prev?.gifUrl
          : prev?.gifUrlFallback,
    })
  })

  await db.transaction('rw', [db.exercises, db.meta], async () => {
    await db.exercises.bulkPut(records)
    const row: CatalogMeta = { id: META_ID, version: CATALOG_VERSION, count: records.length, at: now }
    await db.meta.put(row)
  })
}

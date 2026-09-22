import { db, ensureSettings } from './db'
import { uid, type Place } from './types'

const DEFAULT_PLACE_NAME = 'Academia 1'

export function sortPlaces(list: Place[]): Place[] {
  return [...list].sort((a, b) => {
    const ao = a.order ?? 0
    const bo = b.order ?? 0
    if (ao !== bo) return ao - bo
    return a.createdAt - b.createdAt
  })
}

/**
 * Roda uma vez na vida do banco: cria um local padrão e adota as sessões que
 * ainda não têm local, pra não perder o histórico quando o filtro por local
 * entrar em cena. Depois disso só garante que `currentPlaceId` aponte pra algo.
 */
export async function ensureDefaultPlace(): Promise<void> {
  await ensureSettings()
  await db.transaction('rw', db.places, db.sessions, db.settings, db.meta, async () => {
    const settings = await db.settings.get('app')

    if (await db.meta.get('places_init')) {
      if (settings && !settings.currentPlaceId) {
        const first = sortPlaces(await db.places.toArray())[0]
        if (first) await db.settings.put({ ...settings, currentPlaceId: first.id })
      }
      return
    }

    const place: Place = { id: uid('pl_'), name: DEFAULT_PLACE_NAME, order: 0, createdAt: Date.now() }
    await db.places.add(place)
    const orphans = (await db.sessions.toArray()).filter((s) => !s.placeId)
    if (orphans.length > 0) {
      await db.sessions.bulkUpdate(orphans.map((s) => ({ key: s.id, changes: { placeId: place.id } })))
    }
    if (settings) await db.settings.put({ ...settings, currentPlaceId: place.id })
    await db.meta.put({ id: 'places_init', at: Date.now() })
  })
}

export async function setCurrentPlace(placeId: string): Promise<void> {
  const settings = await ensureSettings()
  await db.settings.put({ ...settings, currentPlaceId: placeId })
}

export async function createPlace(name: string): Promise<Place> {
  const trimmed = name.trim()
  const existing = await db.places.toArray()
  const place: Place = {
    id: uid('pl_'),
    name: trimmed || `Local ${existing.length + 1}`,
    order: existing.length,
    createdAt: Date.now(),
  }
  await db.places.add(place)
  return place
}

/** Apaga o local; sessões dele ficam sem local e o local atual é reajustado. */
export async function deletePlace(id: string): Promise<void> {
  await db.transaction('rw', db.places, db.sessions, db.settings, async () => {
    const affected = (await db.sessions.toArray()).filter((s) => s.placeId === id)
    if (affected.length > 0) {
      await db.sessions.bulkUpdate(affected.map((s) => ({ key: s.id, changes: { placeId: undefined } })))
    }
    await db.places.delete(id)
    const settings = await db.settings.get('app')
    if (settings && settings.currentPlaceId === id) {
      const next = sortPlaces(await db.places.toArray())[0]
      await db.settings.put({ ...settings, currentPlaceId: next?.id })
    }
  })
}

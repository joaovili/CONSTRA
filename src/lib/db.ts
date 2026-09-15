import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, Exercise, Routine, WorkoutSession } from './types'

class LogbookDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('logbook-treino')
    this.version(1).stores({
      exercises: 'id, name, muscleGroup, equipment',
      routines: 'id, name, updatedAt',
      sessions: 'id, routineId, startedAt',
      settings: 'id',
    })
  }
}

export const db = new LogbookDB()

/** Cria o registro de settings se não existir. Chamar em useEffect/boot — NUNCA dentro de useLiveQuery. */
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app')
  if (existing) return existing
  const fresh: AppSettings = {
    id: 'app',
    unit: 'kg',
    restSeconds: 90,
    installedAt: Date.now(),
  }
  await db.settings.put(fresh)
  return fresh
}

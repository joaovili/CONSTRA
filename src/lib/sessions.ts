import { db } from './db'
import { uid, type Routine, type WorkoutSession } from './types'

/** Sessão aberta (sem término). Só pode existir uma por vez. */
export async function getOpenSession(): Promise<WorkoutSession | undefined> {
  const list = await db.sessions.orderBy('startedAt').reverse().toArray()
  return list.find((s) => !s.finishedAt)
}

/**
 * Cria uma sessão herdando o local atual. Se já houver uma aberta, devolve a
 * existente — o app nunca mantém dois treinos abertos ao mesmo tempo.
 */
export async function startWorkout(routine?: Routine): Promise<WorkoutSession> {
  const open = await getOpenSession()
  if (open) return open
  const settings = await db.settings.get('app')
  const session: WorkoutSession = {
    id: uid('ws_'),
    routineId: routine?.id,
    routineName: routine?.name ?? 'Treino livre',
    placeId: settings?.currentPlaceId,
    startedAt: Date.now(),
    sets: [],
  }
  await db.sessions.add(session)
  return session
}

import type { WorkoutSession } from './types'

/** 1RM estimado (Epley): peso * (1 + reps/30) */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

export interface HistoryPoint {
  date: number
  maxWeight: number
  maxReps: number
  volume: number
  best1RM: number
  sets: number
}

export interface ExerciseHistory {
  exerciseId: string
  sessions: HistoryPoint[]
}

export function historyForExercise(sessions: WorkoutSession[], exerciseId: string): ExerciseHistory {
  const perSession = new Map<number, HistoryPoint>()
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt)
  for (const s of sorted) {
    const sets = s.sets.filter((x) => x.exerciseId === exerciseId && x.done && x.kind !== 'warmup')
    if (sets.length === 0) continue
    const maxWeight = Math.max(...sets.map((x) => x.weight))
    const maxReps = Math.max(...sets.filter((x) => x.weight === maxWeight).map((x) => x.reps))
    const volume = sets.reduce((acc, x) => acc + x.weight * x.reps, 0)
    const best1RM = Math.max(...sets.map((x) => epley1RM(x.weight, x.reps)))
    perSession.set(s.startedAt, { maxWeight, maxReps, volume, best1RM, sets: sets.length, date: s.startedAt })
  }
  return { exerciseId, sessions: [...perSession.values()].sort((a, b) => a.date - b.date) }
}

export interface PRInfo {
  isPR: boolean
  type?: 'peso' | 'volume' | 'reps'
  detail?: string
}

/** Última carga usada no exercício (para pré-preencher sugestão) */
export function lastLoad(sessions: WorkoutSession[], exerciseId: string): { weight: number; reps: number } | null {
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt)
  for (const s of sorted) {
    const sets = s.sets.filter((x) => x.exerciseId === exerciseId && x.done && x.kind === 'normal')
    if (sets.length > 0) {
      const last = sets[sets.length - 1]
      return { weight: last.weight, reps: last.reps }
    }
  }
  return null
}

/** Última marca no exercício + dica de progressão (+1 rep ou +carga). */
export function suggestNext(
  sessions: WorkoutSession[],
  exerciseId: string,
): { weight: number; reps: number; hint: string } | null {
  const hist = historyForExercise(sessions, exerciseId).sessions
  if (hist.length === 0) return null
  const last = hist[hist.length - 1]
  return {
    weight: last.maxWeight,
    reps: last.maxReps,
    hint: `Última: ${last.maxWeight} × ${last.maxReps}. Tente ${last.maxWeight} × ${last.maxReps + 1} ou +2,5 de carga.`,
  }
}

export function detectPR(
  sessions: WorkoutSession[],
  exerciseId: string,
  currentWeight: number,
  currentReps: number,
): PRInfo {
  const hist = historyForExercise(sessions, exerciseId).sessions
  if (hist.length === 0) return { isPR: currentWeight > 0, type: 'peso', detail: 'Primeiro registro!' }
  const prevMaxWeight = Math.max(...hist.map((h) => h.maxWeight))
  const prevBest1RM = Math.max(...hist.map((h) => h.best1RM))
  const cur1RM = epley1RM(currentWeight, currentReps)
  if (currentWeight > prevMaxWeight) {
    return { isPR: true, type: 'peso', detail: `Novo recorde de carga: ${currentWeight} (antes ${prevMaxWeight})` }
  }
  if (cur1RM > prevBest1RM * 1.005) {
    return { isPR: true, type: 'reps', detail: `Novo melhor 1RM estimado: ${cur1RM.toFixed(1)}` }
  }
  return { isPR: false }
}

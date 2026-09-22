import type { WorkoutSession } from './types'

/** Sessão conta pro filtro de local? Sem filtro, tudo conta. */
function inPlace(s: WorkoutSession, placeId?: string): boolean {
  return !placeId || s.placeId === placeId
}

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

export function historyForExercise(sessions: WorkoutSession[], exerciseId: string, placeId?: string): ExerciseHistory {
  const perSession = new Map<number, HistoryPoint>()
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt)
  for (const s of sorted) {
    if (!inPlace(s, placeId)) continue
    const sets = s.sets.filter(
      (x) => x.exerciseId === exerciseId && x.done && x.kind !== 'warmup' && x.kind !== 'prep',
    )
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
export function lastLoad(
  sessions: WorkoutSession[],
  exerciseId: string,
  placeId?: string,
): { weight: number; reps: number } | null {
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt)
  for (const s of sorted) {
    if (!inPlace(s, placeId)) continue
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
  placeId?: string,
): { weight: number; reps: number; hint: string } | null {
  const hist = historyForExercise(sessions, exerciseId, placeId).sessions
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
  placeId?: string,
): PRInfo {
  const hist = historyForExercise(sessions, exerciseId, placeId).sessions
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

/** Ritmo em minutos por km — aritmética sobre os valores digitados (não mede distância). */
export function paceMinPerKm(durationMin?: number, distanceKm?: number): number | null {
  if (!durationMin || !distanceKm || distanceKm <= 0) return null
  return durationMin / distanceKm
}

/** Formata ritmo como "5:30/km". */
export function formatPace(pace: number | null): string | null {
  if (pace == null || !Number.isFinite(pace) || pace <= 0) return null
  const totalSeconds = Math.round(pace * 60)
  const min = Math.floor(totalSeconds / 60)
  const sec = totalSeconds % 60
  return `${min}:${String(sec).padStart(2, '0')}/km`
}

/** Cronômetro: "mm:ss" ou "h:mm:ss" a partir de milissegundos. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Duração legível: "45min" ou "1h05". */
export function formatDuration(min?: number): string | null {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

/** Carga do treino = esforço percebido × tempo. Base para comparar esforço acumulado. */
export function trainingLoad(durationMin?: number, effort?: number): number | null {
  if (!durationMin || !effort) return null
  return Math.round(durationMin * effort)
}


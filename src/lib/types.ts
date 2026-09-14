export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Core'
  | 'Glúteos'
  | 'Corpo todo'

export type Equipment =
  | 'Barra'
  | 'Haltere'
  | 'Máquina'
  | 'Cabo'
  | 'Peso corporal'
  | 'Kettlebell'
  | 'Outro'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  unilateral: boolean
  builtin?: boolean
  createdAt: number
}

export interface RoutineItem {
  exerciseId: string
  targetSets: number
  targetReps: string // ex: "8-12", "5", "10"
  note?: string
}

export interface Routine {
  id: string
  name: string
  items: RoutineItem[]
  builtin?: boolean
  createdAt: number
  updatedAt: number
}

export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure'

export interface SetEntry {
  id: string
  exerciseId: string
  setIndex: number
  kind: SetKind
  weight: number // kg (ou lbs conforme settings)
  reps: number
  rpe?: number
  done: boolean
  createdAt: number
}

export interface WorkoutSession {
  id: string
  routineId?: string
  routineName: string
  startedAt: number
  finishedAt?: number
  sets: SetEntry[]
}

export interface AppSettings {
  id: string // sempre 'app'
  unit: 'kg' | 'lbs'
  restSeconds: number
  installedAt: number
}

export const SET_KIND_LABEL: Record<SetKind, string> = {
  normal: 'Normal',
  warmup: 'Aquec.',
  drop: 'Drop',
  failure: 'Falha',
}

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

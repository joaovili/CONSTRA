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

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Glúteos',
  'Corpo todo',
]

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
  order?: number
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

export interface MetaRow {
  id: string
  at: number
}

export type ActivityKind = 'Corrida' | 'Caminhada'

export const ACTIVITY_KINDS: ActivityKind[] = ['Corrida', 'Caminhada']

/** Tipos de treino por atividade. Novas atividades entram aqui quando existirem. */
export const TRAINING_TYPES: Record<ActivityKind, string[]> = {
  Corrida: [
    'Regenerativo',
    'Longão',
    'Tempo (ritmo)',
    'Intervalado',
    'Sprints (tiros)',
    'Fartlek',
    'Progressivo',
    'Prova / teste',
    'Livre',
  ],
  Caminhada: ['Leve', 'Moderada', 'Rápida', 'Inclinada', 'Livre'],
}

export interface CardioSession {
  id: string
  kind: ActivityKind
  trainingType: string
  startedAt: number
  durationMin?: number // tempo em minutos
  distanceKm?: number // distância em km (digitada, não medida)
  calories?: number // kcal
  effort?: number // 1-10: esforço percebido durante
  feelAfter?: number // 1-5: como se sente agora
  notes?: string
  createdAt: number
}

/** Escala de esforço (durante). Rótulos descritivos — o número é só a métrica por trás. */
export const EFFORT_SCALE: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Muito tranquilo' },
  { value: 2, label: 'Bem leve' },
  { value: 3, label: 'Leve' },
  { value: 4, label: 'Confortável' },
  { value: 5, label: 'Moderado' },
  { value: 6, label: 'Puxado' },
  { value: 7, label: 'Difícil' },
  { value: 8, label: 'Muito difícil' },
  { value: 9, label: 'Quase no limite' },
  { value: 10, label: 'No limite' },
]

/** Escala de sensação (após/agora). */
export const FEEL_SCALE: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Exausto' },
  { value: 2, label: 'Bem cansado' },
  { value: 3, label: 'Cansado, mas ok' },
  { value: 4, label: 'Bem' },
  { value: 5, label: 'Recuperado' },
]

export function effortLabel(value?: number): string | undefined {
  return EFFORT_SCALE.find((e) => e.value === value)?.label
}

export function feelLabel(value?: number): string | undefined {
  return FEEL_SCALE.find((e) => e.value === value)?.label
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

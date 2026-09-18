import { db } from './db'
import type { Exercise } from './types'
import { uid } from './types'

const EXERCISES: Array<Omit<Exercise, 'id' | 'createdAt'>> = [
  { name: 'Supino reto barra', muscleGroup: 'Peito', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Supino inclinado haltere', muscleGroup: 'Peito', equipment: 'Haltere', unilateral: false, builtin: true },
  { name: 'Crucifixo máquina', muscleGroup: 'Peito', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Crossover polia', muscleGroup: 'Peito', equipment: 'Cabo', unilateral: false, builtin: true },
  { name: 'Flexão de braço', muscleGroup: 'Peito', equipment: 'Peso corporal', unilateral: false, builtin: true },
  { name: 'Puxada frente', muscleGroup: 'Costas', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Remada curvada', muscleGroup: 'Costas', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Remada unilateral (serrote)', muscleGroup: 'Costas', equipment: 'Haltere', unilateral: true, builtin: true },
  { name: 'Barra fixa', muscleGroup: 'Costas', equipment: 'Peso corporal', unilateral: false, builtin: true },
  { name: 'Remada baixa', muscleGroup: 'Costas', equipment: 'Cabo', unilateral: false, builtin: true },
  { name: 'Levantamento terra', muscleGroup: 'Costas', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Agachamento livre', muscleGroup: 'Pernas', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Leg press 45°', muscleGroup: 'Pernas', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Cadeira extensora', muscleGroup: 'Pernas', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Cadeira flexora', muscleGroup: 'Pernas', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Stiff', muscleGroup: 'Pernas', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Afundo (passada)', muscleGroup: 'Pernas', equipment: 'Haltere', unilateral: true, builtin: true },
  { name: 'Panturrilha em pé', muscleGroup: 'Pernas', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Elevação pélvica (hip thrust)', muscleGroup: 'Glúteos', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Abdutora', muscleGroup: 'Glúteos', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Desenvolvimento militar', muscleGroup: 'Ombros', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Desenvolvimento haltere', muscleGroup: 'Ombros', equipment: 'Haltere', unilateral: false, builtin: true },
  { name: 'Elevação lateral', muscleGroup: 'Ombros', equipment: 'Haltere', unilateral: false, builtin: true },
  { name: 'Elevação frontal', muscleGroup: 'Ombros', equipment: 'Haltere', unilateral: false, builtin: true },
  { name: 'Remada alta', muscleGroup: 'Ombros', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Face pull', muscleGroup: 'Ombros', equipment: 'Cabo', unilateral: false, builtin: true },
  { name: 'Rosca direta barra', muscleGroup: 'Bíceps', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Rosca alternada', muscleGroup: 'Bíceps', equipment: 'Haltere', unilateral: true, builtin: true },
  { name: 'Rosca martelo', muscleGroup: 'Bíceps', equipment: 'Haltere', unilateral: true, builtin: true },
  { name: 'Rosca scott', muscleGroup: 'Bíceps', equipment: 'Máquina', unilateral: false, builtin: true },
  { name: 'Tríceps testa', muscleGroup: 'Tríceps', equipment: 'Barra', unilateral: false, builtin: true },
  { name: 'Tríceps corda', muscleGroup: 'Tríceps', equipment: 'Cabo', unilateral: false, builtin: true },
  { name: 'Mergulho (paralela)', muscleGroup: 'Tríceps', equipment: 'Peso corporal', unilateral: false, builtin: true },
  { name: 'Tríceps francês', muscleGroup: 'Tríceps', equipment: 'Haltere', unilateral: false, builtin: true },
  { name: 'Prancha', muscleGroup: 'Core', equipment: 'Peso corporal', unilateral: false, builtin: true },
  { name: 'Abdominal crunch', muscleGroup: 'Core', equipment: 'Peso corporal', unilateral: false, builtin: true },
  { name: 'Abdominal infra', muscleGroup: 'Core', equipment: 'Peso corporal', unilateral: false, builtin: true },
  { name: 'Russian twist', muscleGroup: 'Core', equipment: 'Kettlebell', unilateral: false, builtin: true },
  { name: 'Kettlebell swing', muscleGroup: 'Corpo todo', equipment: 'Kettlebell', unilateral: false, builtin: true },
  { name: 'Burpee', muscleGroup: 'Corpo todo', equipment: 'Peso corporal', unilateral: false, builtin: true },
]

let seedPromise: Promise<void> | null = null

/**
 * Popula a biblioteca padrão de exercícios, uma única vez na vida do banco.
 * O marcador em `meta` evita duplicação quando o React StrictMode roda o efeito 2x.
 * Rotinas NÃO são semeadas: o usuário começa sem nenhuma rotina cadastrada.
 */
export function seedIfEmpty(): Promise<void> {
  if (!seedPromise) seedPromise = runSeed()
  return seedPromise
}

async function runSeed(): Promise<void> {
  await db.transaction('rw', db.exercises, db.meta, async () => {
    if (await db.meta.get('seed')) return
    if ((await db.exercises.count()) === 0) {
      const now = Date.now()
      await db.exercises.bulkAdd(EXERCISES.map((e) => ({ ...e, id: uid('ex_'), createdAt: now })))
    }
    await db.meta.put({ id: 'seed', at: Date.now() })
  })
}

import { db } from './db'
import type { Exercise, Routine } from './types'
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

interface TemplatePick {
  name: string
  sets: number
  reps: string
}

interface TemplateDef {
  name: string
  picks: TemplatePick[]
}

function pick(name: string, sets: number, reps: string): TemplatePick {
  return { name, sets, reps }
}

export async function seedIfEmpty(): Promise<void> {
  const exCount = await db.exercises.count()
  if (exCount > 0) return
  const now = Date.now()

  const withIds = EXERCISES.map((e) => ({ ...e, id: uid('ex_'), createdAt: now }))
  await db.exercises.bulkAdd(withIds)

  const byName = new Map(withIds.map((e) => [e.name.toLowerCase(), e.id]))
  const templates: TemplateDef[] = [
    {
      name: 'Fullbody A',
      picks: [
        pick('Agachamento livre', 4, '6-8'),
        pick('Supino reto barra', 3, '8-10'),
        pick('Remada curvada', 3, '8-10'),
        pick('Desenvolvimento haltere', 3, '10-12'),
        pick('Prancha', 3, '60s'),
      ],
    },
    {
      name: 'Fullbody B',
      picks: [
        pick('Levantamento terra', 4, '5'),
        pick('Puxada frente', 3, '10-12'),
        pick('Supino inclinado haltere', 3, '8-12'),
        pick('Elevação lateral', 3, '12-15'),
        pick('Rosca direta barra', 2, '10-12'),
      ],
    },
    {
      name: 'Push / Pull / Legs — Push',
      picks: [
        pick('Supino reto barra', 4, '6-8'),
        pick('Supino inclinado haltere', 3, '8-12'),
        pick('Crossover polia', 3, '12-15'),
        pick('Desenvolvimento militar', 3, '8-10'),
        pick('Tríceps corda', 3, '10-12'),
      ],
    },
    {
      name: 'Upper / Lower — Upper',
      picks: [
        pick('Barra fixa', 4, '6-10'),
        pick('Supino reto barra', 4, '6-8'),
        pick('Remada unilateral (serrote)', 3, '10-12'),
        pick('Elevação lateral', 3, '12-15'),
        pick('Rosca alternada', 2, '10-12'),
      ],
    },
  ]

  for (const t of templates) {
    const items: Routine['items'] = []
    for (const p of t.picks) {
      const id = byName.get(p.name.toLowerCase())
      if (id) items.push({ exerciseId: id, targetSets: p.sets, targetReps: p.reps })
    }
    await db.routines.add({
      id: uid('rt_'),
      name: t.name,
      items,
      builtin: true,
      createdAt: now,
      updatedAt: now,
    })
  }
}

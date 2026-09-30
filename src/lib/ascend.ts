import type { Equipment, Exercise, MuscleGroup } from './types'

/**
 * Cliente da biblioteca AscendAPI (ExerciseDB V1, tier gratuito).
 *
 * Busca sob demanda: nada do catálogo é baixado em massa. Consultamos a API
 * quando o usuário procura um exercício e só o escolhido é salvo localmente
 * (ver `ascendImport`). Os GIFs (180p) rotacionam toda segunda 00:00 UTC, então
 * a mídia é rebuscada ao abrir o exercício (`ExerciseInfo`).
 */
const ASCEND_BASE = 'https://oss.exercisedb.dev/api/v1'

/** Formato retornado pela AscendAPI. */
export interface AscendExercise {
  exerciseId: string
  name: string
  gifUrl: string
  bodyParts: string[]
  equipments: string[]
  targetMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
}

const RETRY_DELAY_MS = 2100 // tier gratuito limita a ~1 req / 2s

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * GET resiliente: em 429 espera o `retry-after`; em falha de rede tenta de
 * novo com backoff. Só desiste depois de `retries` tentativas.
 */
async function fetchJson<T>(url: string, retries = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (res.ok) return (await res.json()) as T
      if (res.status === 429 && attempt < retries) {
        const retryAfter = Number(res.headers.get('retry-after'))
        await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAY_MS)
        continue
      }
      throw new Error(`AscendAPI ${res.status}`)
    } catch (err) {
      if (attempt >= retries) throw err
      await delay(RETRY_DELAY_MS * (attempt + 1))
    }
  }
}

/** Busca exercícios por termo (fuzzy). Retorna poucos campos. */
export async function searchAscend(search: string): Promise<Array<{ exerciseId: string; name: string; gifUrl: string }>> {
  const q = search.trim()
  if (!q) return []
  const url = `${ASCEND_BASE}/exercises/search?search=${encodeURIComponent(q)}`
  const json = await fetchJson<{ success: boolean; data: Array<{ exerciseId: string; name: string; gifUrl: string }> }>(url)
  return json.data ?? []
}

/** Busca um exercício completo pelo id estável. */
export async function getAscendExercise(exerciseId: string): Promise<AscendExercise | null> {
  const json = await fetchJson<{ success: boolean; data: AscendExercise }>(
    `${ASCEND_BASE}/exercises/${encodeURIComponent(exerciseId)}`,
  )
  return json.data ?? null
}

/** Exercício da Ascend → registro local. `id` é determinístico por ascendId. */
export function toLocalExercise(ex: AscendExercise, createdAt = Date.now()): Exercise {
  return {
    id: `ex_as_${ex.exerciseId}`,
    name: ex.name,
    muscleGroup: muscleGroupFor(ex.targetMuscles, ex.bodyParts),
    equipment: equipmentFor(ex.equipments),
    unilateral: isUnilateral(ex.name),
    builtin: true,
    source: 'ascend',
    ascendId: ex.exerciseId,
    gifUrl: ex.gifUrl,
    bodyParts: ex.bodyParts,
    targetMuscles: ex.targetMuscles,
    secondaryMuscles: ex.secondaryMuscles,
    instructions: ex.instructions,
    createdAt,
  }
}

const has = (values: Set<string>, ...keys: string[]) => keys.some((k) => [...values].some((v) => v.includes(k)))

/** Mapeia músculos/corpo da Ascend para os grupos do app (ordem importa). */
export function muscleGroupFor(targetMuscles: string[] = [], bodyParts: string[] = []): MuscleGroup {
  const v = new Set([...targetMuscles, ...bodyParts].map((s) => s.toLowerCase()))
  if (has(v, 'pectoral', 'chest')) return 'Peito'
  if (has(v, 'glute')) return 'Glúteos'
  if (has(v, 'bicep')) return 'Bíceps'
  if (has(v, 'tricep')) return 'Tríceps'
  if (has(v, 'delt', 'shoulder')) return 'Ombros'
  if (has(v, 'abdominal', 'abs', 'oblique', 'core', 'waist', 'serratus', 'hip flexor')) return 'Core'
  if (has(v, 'quad', 'hamstring', 'calf', 'calves', 'adductor', 'abductor', 'sartorius', 'lower leg', 'upper leg')) return 'Pernas'
  if (has(v, 'lat', 'back', 'trap', 'rhomboid', 'spine', 'erector', 'infraspinatus', 'teres')) return 'Costas'
  if (has(v, 'cardio')) return 'Corpo todo'
  return 'Corpo todo'
}

/** Equipamento da Ascend → enum do app. */
export function equipmentFor(equipments: string[] = []): Equipment {
  const e = equipments.map((s) => s.toLowerCase())
  if (e.some((x) => x.includes('barbell'))) return 'Barra'
  if (e.includes('dumbbell')) return 'Haltere'
  if (e.includes('cable')) return 'Cabo'
  if (e.includes('kettlebell')) return 'Kettlebell'
  if (e.includes('assisted') || e.some((x) => x.includes('machine'))) return 'Máquina'
  if (e.includes('bodyweight') || e.includes('weighted')) return 'Peso corporal'
  if (e.includes('resistance band')) return 'Outro'
  return 'Outro'
}

function isUnilateral(name: string): boolean {
  return /\b(single|one[- ]arm|one[- ]leg|unilateral|alternating)\b/i.test(name)
}

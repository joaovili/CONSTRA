import type { Equipment, Exercise, MuscleGroup } from './types'

/**
 * Cliente da biblioteca AscendAPI (ExerciseDB V1, tier gratuito).
 *
 * A lista completa de exercícios (sem GIF) é empacotada no app — ver
 * `ascendCatalog` e `public/ascend-catalog.json`. Só os GIFs (180p) são
 * buscados na API, ao abrir um exercício, porque as URLs rotacionam toda
 * segunda 00:00 UTC.
 */
const ASCEND_BASE = 'https://oss.exercisedb.dev/api/v1'

/** Formato retornado pela AscendAPI (detalhe de um exercício). */
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

/** Item do catálogo empacotado no app (mesmo formato, sem `gifUrl`). */
export type AscendCatalogEntry = Omit<AscendExercise, 'gifUrl'>

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

/** Busca um exercício completo (com GIF e instruções) pelo id estável. */
export async function getAscendExercise(exerciseId: string): Promise<AscendExercise | null> {
  const json = await fetchJson<{ success: boolean; data: AscendExercise }>(
    `${ASCEND_BASE}/exercises/${encodeURIComponent(exerciseId)}`,
  )
  return json.data ?? null
}

/** Item do catálogo → registro local. `id` é determinístico por ascendId. */
export function catalogEntryToLocal(entry: AscendCatalogEntry, createdAt = Date.now(), id?: string): Exercise {
  return {
    id: id ?? `ex_as_${entry.exerciseId}`,
    name: entry.name,
    muscleGroup: muscleGroupFor(entry.targetMuscles, entry.bodyParts),
    equipment: equipmentFor(entry.equipments),
    unilateral: isUnilateral(entry.name),
    builtin: true,
    source: 'ascend',
    ascendId: entry.exerciseId,
    bodyParts: entry.bodyParts,
    targetMuscles: entry.targetMuscles,
    secondaryMuscles: entry.secondaryMuscles,
    instructions: entry.instructions,
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

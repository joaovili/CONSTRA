import { getAscendExercise, toLocalExercise } from './ascend'
import { db } from './db'
import type { Exercise } from './types'

/**
 * Importa um exercício da AscendAPI para a biblioteca local, sob demanda.
 * Se já existir um registro com o mesmo `ascendId`, reaproveita (e devolve) o
 * existente para não duplicar nem quebrar rotinas/sessões que já o usam.
 */
export async function importAscendExercise(ascendId: string): Promise<Exercise> {
  const existing = await db.exercises.where('ascendId').equals(ascendId).first()
  if (existing) return existing

  const full = await getAscendExercise(ascendId)
  if (!full) throw new Error('Exercício não encontrado na AscendAPI')

  const record = toLocalExercise(full)
  const sameId = await db.exercises.get(record.id)
  if (sameId) return sameId

  await db.exercises.put(record)
  return record
}

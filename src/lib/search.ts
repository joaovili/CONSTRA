import type { Exercise } from './types'

/** Minúsculas e sem acentos, para buscar "elevacao" e "elevação" igual. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Busca por nome em pt-BR ou no nome original em inglês. Todos os termos
 * digitados precisam aparecer (ex: "supino inclinado").
 */
export function matchesExercise(exercise: Exercise, query: string): boolean {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizeSearch(`${exercise.name} ${exercise.nameEn ?? ''}`)
  return terms.every((term) => haystack.includes(term))
}

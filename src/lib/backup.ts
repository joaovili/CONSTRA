import { db } from './db'
import {
  MUSCLE_GROUPS,
  uid,
  type Equipment,
  type Exercise,
  type MuscleGroup,
  type Routine,
  type RoutineItem,
} from './types'

const EQUIPMENT: Equipment[] = ['Barra', 'Haltere', 'Máquina', 'Cabo', 'Peso corporal', 'Kettlebell', 'Outro']

const HEADER = ['rotina', 'exercicio', 'grupo_muscular', 'equipamento', 'unilateral', 'series', 'reps', 'obs']

export interface ImportResult {
  routines: number
  exercises: number
}

function escapeCSV(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function normalizeHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const s = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Exporta as fichas de treino (rotinas + exercícios alvo) em CSV, uma linha por exercício. */
export async function exportRoutinesCSV(): Promise<string> {
  const [routines, exercises] = await Promise.all([db.routines.toArray(), db.exercises.toArray()])
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const lines = [HEADER.join(',')]
  for (const routine of routines.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))) {
    for (const item of routine.items) {
      const ex = byId.get(item.exerciseId)
      lines.push(
        [
          escapeCSV(routine.name),
          escapeCSV(ex?.name ?? ''),
          escapeCSV(ex?.muscleGroup ?? ''),
          escapeCSV(ex?.equipment ?? ''),
          ex?.unilateral ? 'sim' : 'nao',
          String(item.targetSets),
          escapeCSV(item.targetReps),
          escapeCSV(item.note ?? ''),
        ].join(','),
      )
    }
  }
  return lines.join('\n')
}

/**
 * Importa fichas de treino a partir de um CSV. Mescla por nome de rotina:
 * rotinas com o mesmo nome são atualizadas, as demais são preservadas.
 * Exercícios são reaproveitados pelo nome ou criados quando não existem.
 */
export async function importRoutinesCSV(text: string): Promise<ImportResult> {
  const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''))
  if (rows.length < 2) throw new Error('CSV vazio')

  const header = rows[0].map(normalizeHeader)
  const iRoutine = header.indexOf('rotina')
  const iExercise = header.indexOf('exercicio')
  if (iRoutine < 0 || iExercise < 0) throw new Error('Cabeçalho inválido: faltam as colunas "rotina" e "exercicio"')
  const iGroup = header.indexOf('grupo_muscular')
  const iEquipment = header.indexOf('equipamento')
  const iUnilateral = header.indexOf('unilateral')
  const iSets = header.indexOf('series')
  const iReps = header.indexOf('reps')
  const iNote = header.indexOf('obs')

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')

  const groups = new Map<string, { name: string; rows: string[][] }>()
  for (const r of rows.slice(1)) {
    const name = (r[iRoutine] ?? '').trim()
    const exercise = (r[iExercise] ?? '').trim()
    if (!name || !exercise) continue
    const key = name.toLowerCase()
    let group = groups.get(key)
    if (!group) {
      group = { name, rows: [] }
      groups.set(key, group)
    }
    group.rows.push(r)
  }
  if (groups.size === 0) throw new Error('Nenhuma ficha encontrada no CSV')

  // Antes de importar, recupera exercícios que existiam no histórico. As
  // rotinas/treinos guardam só o `exerciseId`; casando a ordem dos itens com a
  // ordem das linhas do CSV, reconstruímos id → nome e recriamos o exercício
  // com o MESMO id. Assim histórico e rotinas religam sozinhos.
  await recoverMissingExercises(groups, { iExercise, iGroup, iEquipment, iUnilateral })

  let createdExercises = 0
  await db.transaction('rw', [db.exercises, db.routines], async () => {
    const exercises = await db.exercises.toArray()
    const exerciseByName = new Map<string, Exercise>()
    for (const e of exercises) {
      const keys = [e.name]
      // CSVs antigos traziam o nome em inglês.
      if (e.nameEn) keys.push(e.nameEn)
      for (const raw of keys) {
        const key = raw.trim().toLowerCase()
        const current = exerciseByName.get(key)
        // A base embutida (com GIF) vence exercícios recuperados/criados.
        if (!current || e.source === 'ascend') exerciseByName.set(key, e)
      }
    }
    const routines = await db.routines.toArray()
    const routineByName = new Map(routines.map((r) => [r.name.trim().toLowerCase(), r]))

    for (const { name, rows: groupRows } of groups.values()) {
      const items: RoutineItem[] = []
      for (const r of groupRows) {
        const exerciseName = (r[iExercise] ?? '').trim()
        const exerciseKey = exerciseName.toLowerCase()
        let exercise = exerciseByName.get(exerciseKey)
        if (!exercise) {
          const group = cell(r, iGroup)
          const equipment = cell(r, iEquipment)
          const unilateral = cell(r, iUnilateral).toLowerCase()
          exercise = {
            id: uid('ex_'),
            name: exerciseName,
            muscleGroup: (MUSCLE_GROUPS as string[]).includes(group) ? (group as MuscleGroup) : 'Corpo todo',
            equipment: (EQUIPMENT as string[]).includes(equipment) ? (equipment as Equipment) : 'Outro',
            unilateral: ['sim', 's', '1', 'true', 'verdadeiro', 'yes'].includes(unilateral),
            createdAt: Date.now(),
          }
          await db.exercises.add(exercise)
          exerciseByName.set(exerciseKey, exercise)
          createdExercises++
        }
        const sets = parseInt(cell(r, iSets), 10)
        const note = cell(r, iNote)
        items.push({
          exerciseId: exercise.id,
          targetSets: Number.isFinite(sets) && sets > 0 ? sets : 3,
          targetReps: cell(r, iReps),
          ...(note ? { note } : {}),
        })
      }

      const existing = routineByName.get(name.toLowerCase())
      if (existing) {
        await db.routines.update(existing.id, { items, updatedAt: Date.now() })
      } else {
        const now = Date.now()
        const routine: Routine = { id: uid('rt_'), name, items, createdAt: now, updatedAt: now }
        await db.routines.add(routine)
        routineByName.set(name.toLowerCase(), routine)
      }
    }
  })

  return { routines: groups.size, exercises: createdExercises }
}

interface CsvColumns {
  iExercise: number
  iGroup: number
  iEquipment: number
  iUnilateral: number
}

/**
 * Recria exercícios perdidos a partir do CSV, preservando o `id` original.
 * Monta `id → nome` casando os itens das rotinas (e a cópia congelada de cada
 * treino) com as linhas do CSV, na mesma ordem em que foram exportados.
 */
async function recoverMissingExercises(
  groups: Map<string, { name: string; rows: string[][] }>,
  cols: CsvColumns,
): Promise<void> {
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
  const recovered = new Map<string, { name: string; group: string; equipment: string; unilateral: string }>()

  const collect = (items: { exerciseId: string }[], csvRows: string[][]) => {
    const n = Math.min(items.length, csvRows.length)
    for (let i = 0; i < n; i++) {
      const id = items[i].exerciseId
      const name = cell(csvRows[i], cols.iExercise)
      if (!id || !name || recovered.has(id)) continue
      recovered.set(id, {
        name,
        group: cell(csvRows[i], cols.iGroup),
        equipment: cell(csvRows[i], cols.iEquipment),
        unilateral: cell(csvRows[i], cols.iUnilateral),
      })
    }
  }

  for (const { name, rows: csvRows } of groups.values()) {
    const routine = await db.routines.where('name').equals(name).first()
    if (routine) collect(routine.items, csvRows)
  }
  for (const s of await db.sessions.toArray()) {
    const group = s.routineName ? groups.get(s.routineName.trim().toLowerCase()) : undefined
    if (group && s.routineItems?.length) collect(s.routineItems, group.rows)
  }
  if (recovered.size === 0) return

  const exercises = await db.exercises.toArray()
  const existingIds = new Set(exercises.map((e) => e.id))
  // Nome do CSV que já existe na base embutida: remapeia o id antigo para o
  // exercício do catálogo (com GIF) em vez de criar uma cópia sem mídia.
  const byName = new Map<string, Exercise>()
  for (const e of exercises) {
    const keys = [e.name]
    if (e.nameEn) keys.push(e.nameEn)
    for (const raw of keys) {
      const key = raw.trim().toLowerCase()
      if (!byName.has(key) || e.source === 'ascend') byName.set(key, e)
    }
  }

  const remap = new Map<string, string>()
  const toAdd: Exercise[] = []
  for (const [id, info] of recovered) {
    if (existingIds.has(id)) continue
    const match = byName.get(info.name.trim().toLowerCase())
    if (match) {
      remap.set(id, match.id)
      continue
    }
    toAdd.push({
      id,
      name: info.name,
      muscleGroup: (MUSCLE_GROUPS as string[]).includes(info.group) ? (info.group as MuscleGroup) : 'Corpo todo',
      equipment: (EQUIPMENT as string[]).includes(info.equipment) ? (info.equipment as Equipment) : 'Outro',
      unilateral: ['sim', 's', '1', 'true', 'verdadeiro', 'yes'].includes(info.unilateral.toLowerCase()),
      createdAt: Date.now(),
    })
  }
  if (toAdd.length > 0) await db.exercises.bulkAdd(toAdd)
  if (remap.size === 0) return

  const mapId = (id: string) => remap.get(id) ?? id
  await db.transaction('rw', [db.routines, db.sessions], async () => {
    for (const r of await db.routines.toArray()) {
      const items = r.items.map((it) => ({ ...it, exerciseId: mapId(it.exerciseId) }))
      if (items.some((it, i) => it.exerciseId !== r.items[i].exerciseId)) {
        await db.routines.update(r.id, { items, updatedAt: Date.now() })
      }
    }
    for (const s of await db.sessions.toArray()) {
      const sets = s.sets.map((st) => ({ ...st, exerciseId: mapId(st.exerciseId) }))
      const routineItems = s.routineItems?.map((it) => ({ ...it, exerciseId: mapId(it.exerciseId) }))
      if (sets.some((st, i) => st.exerciseId !== s.sets[i].exerciseId) || routineItems?.some((it, i) => it.exerciseId !== s.routineItems?.[i].exerciseId)) {
        await db.sessions.update(s.id, { sets, ...(routineItems ? { routineItems } : {}) })
      }
    }
  })
}

export function downloadFile(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

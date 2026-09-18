import { db } from './db'
import type { Exercise, Routine, RoutineItem } from './types'

let repairPromise: Promise<void> | null = null

/** Reparo idempotente: remove duplicados e reconecta histórico/rotinas. Roda 1x. */
export function repairData(): Promise<void> {
  if (!repairPromise) repairPromise = runRepair()
  return repairPromise
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

async function runRepair(): Promise<void> {
  await db.transaction('rw', [db.exercises, db.routines, db.sessions, db.meta], async () => {
    if (await db.meta.get('repair-v1')) return

    const exercises = await db.exercises.toArray()
    const byKey = new Map<string, Exercise[]>()
    for (const e of exercises) {
      const key = `${e.muscleGroup}|${norm(e.name)}`
      const list = byKey.get(key)
      if (list) list.push(e)
      else byKey.set(key, [e])
    }

    const remap = new Map<string, string>()
    const toDelete: string[] = []
    for (const list of byKey.values()) {
      if (list.length < 2) continue
      list.sort(
        (a, b) =>
          Number(b.builtin ? 1 : 0) - Number(a.builtin ? 1 : 0) ||
          a.createdAt - b.createdAt ||
          a.id.localeCompare(b.id),
      )
      for (const dup of list.slice(1)) {
        remap.set(dup.id, list[0].id)
        toDelete.push(dup.id)
      }
    }

    if (toDelete.length > 0) {
      for (const r of await db.routines.toArray()) {
        const items = mergeItems(r, remap)
        if (items !== r.items) await db.routines.update(r.id, { items, updatedAt: Date.now() })
      }
      for (const s of await db.sessions.toArray()) {
        let changed = false
        const sets = s.sets.map((st) => {
          const to = remap.get(st.exerciseId)
          if (to && to !== st.exerciseId) {
            changed = true
            return { ...st, exerciseId: to }
          }
          return st
        })
        if (changed) await db.sessions.update(s.id, { sets })
      }
      await db.exercises.bulkDelete(toDelete)
    }

    const routines = await db.routines.toArray()
    const builtins = new Map<string, Routine[]>()
    for (const r of routines) {
      if (!r.builtin) continue
      const list = builtins.get(norm(r.name))
      if (list) list.push(r)
      else builtins.set(norm(r.name), [r])
    }

    const routineRemap = new Map<string, string>()
    const routinesToDelete: string[] = []
    for (const list of builtins.values()) {
      if (list.length < 2) continue
      list.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      for (const dup of list.slice(1)) {
        routineRemap.set(dup.id, list[0].id)
        routinesToDelete.push(dup.id)
      }
    }

    if (routinesToDelete.length > 0) {
      for (const s of await db.sessions.toArray()) {
        const to = s.routineId ? routineRemap.get(s.routineId) : undefined
        if (to && to !== s.routineId) await db.sessions.update(s.id, { routineId: to })
      }
      await db.routines.bulkDelete(routinesToDelete)
    }

    await db.meta.put({ id: 'repair-v1', at: Date.now() })
  })
}

/** Remapeia exercícios duplicados e remove itens repetidos na mesma rotina. */
function mergeItems(r: Routine, remap: Map<string, string>): RoutineItem[] {
  const out: RoutineItem[] = []
  const seen = new Set<string>()
  let changed = false
  for (const it of r.items) {
    const id = remap.get(it.exerciseId) ?? it.exerciseId
    if (id !== it.exerciseId) changed = true
    if (seen.has(id)) {
      changed = true
      continue
    }
    seen.add(id)
    out.push(id === it.exerciseId ? it : { ...it, exerciseId: id })
  }
  return changed ? out : r.items
}

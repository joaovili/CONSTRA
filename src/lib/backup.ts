import { db } from './db'
import type { WorkoutSession } from './types'

export async function exportJSON(): Promise<string> {
  const [exercises, routines, sessions, settings] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.sessions.toArray(),
    db.settings.toArray(),
  ])
  return JSON.stringify({ app: 'logbook-treino', version: 1, exportedAt: Date.now(), exercises, routines, sessions, settings }, null, 2)
}

export async function importJSON(text: string): Promise<{ exercises: number; routines: number; sessions: number }> {
  const data = JSON.parse(text)
  if (!data || !Array.isArray(data.exercises)) throw new Error('Arquivo inválido')
  await db.transaction('rw', [db.exercises, db.routines, db.sessions, db.settings], async () => {
    if (Array.isArray(data.exercises)) {
      await db.exercises.clear()
      await db.exercises.bulkAdd(data.exercises)
    }
    if (Array.isArray(data.routines)) {
      await db.routines.clear()
      await db.routines.bulkAdd(data.routines)
    }
    if (Array.isArray(data.sessions)) {
      await db.sessions.clear()
      await db.sessions.bulkAdd(data.sessions)
    }
    if (Array.isArray(data.settings) && data.settings[0]) {
      await db.settings.put({ ...data.settings[0], id: 'app' })
    }
  })
  return {
    exercises: data.exercises?.length ?? 0,
    routines: data.routines?.length ?? 0,
    sessions: data.sessions?.length ?? 0,
  }
}

export function downloadFile(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function sessionsToCSV(sessions: WorkoutSession[]): string {
  const rows = ['data,rotina,exercicio_id,peso,reps,rpe,tipo,concluida']
  for (const s of sessions) {
    for (const set of s.sets) {
      rows.push(
        [
          new Date(s.startedAt).toISOString(),
          `"${(s.routineName || '').replace(/"/g, '""')}"`,
          set.exerciseId,
          String(set.weight),
          String(set.reps),
          set.rpe ?? '',
          set.kind,
          set.done ? '1' : '0',
        ].join(','),
      )
    }
  }
  return rows.join('\n')
}

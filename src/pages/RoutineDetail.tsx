import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'

export default function RoutineDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const routine = useLiveQuery(() => (id ? db.routines.get(id) : undefined), [id])
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const [q, setQ] = useState('')
  const [name, setName] = useState('')

  const exById = new Map((exercises ?? []).map((e) => [e.id, e]))

  if (!routine) return <p className="text-zinc-400">Carregando...</p>
  const rt = routine

  const filtered = (exercises ?? []).filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 20)

  async function saveName() {
    const n = name.trim()
    if (!n) return
    await db.routines.update(rt.id, { name: n, updatedAt: Date.now() })
    setName('')
  }

  async function addExercise(exerciseId: string) {
    await db.routines.update(rt.id, {
      items: [...rt.items, { exerciseId, targetSets: 3, targetReps: '10' }],
      updatedAt: Date.now(),
    })
  }

  async function updateItem(idx: number, patch: Partial<{ targetSets: number; targetReps: string; note: string }>) {
    const items = rt.items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    await db.routines.update(rt.id, { items, updatedAt: Date.now() })
  }

  async function removeItem(idx: number) {
    const items = rt.items.filter((_, i) => i !== idx)
    await db.routines.update(rt.id, { items, updatedAt: Date.now() })
  }

  async function move(idx: number, dir: -1 | 1) {
    const items = [...rt.items]
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    ;[items[idx], items[j]] = [items[j], items[idx]]
    await db.routines.update(rt.id, { items, updatedAt: Date.now() })
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-zinc-400">
        ← Voltar
      </button>
      <h1 className="text-2xl font-extrabold">{rt.name}</h1>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Renomear rotina"
          className="min-h-[48px] flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 outline-none focus:border-lime-400"
        />
        <button onClick={saveName} className="rounded-xl bg-zinc-100 px-4 font-bold text-black">
          OK
        </button>
      </div>

      <div className="space-y-2">
        {rt.items.map((it, idx) => {
          const ex = exById.get(it.exerciseId)
          return (
            <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{ex?.name ?? '(exercício removido)'}</p>
                  <p className="text-xs text-zinc-500">
                    {ex?.muscleGroup} • {ex?.equipment}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => move(idx, -1)} className="rounded bg-zinc-800 px-2 py-1">↑</button>
                  <button onClick={() => move(idx, 1)} className="rounded bg-zinc-800 px-2 py-1">↓</button>
                  <button onClick={() => removeItem(idx)} className="rounded bg-zinc-800 px-2 py-1">🗑</button>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  Séries
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={it.targetSets}
                    onChange={(e) => updateItem(idx, { targetSets: Number(e.target.value) || 1 })}
                    className="min-h-[44px] w-full rounded-lg bg-zinc-950 px-2"
                  />
                </label>
                <label className="flex flex-1 items-center gap-2 text-sm">
                  Reps
                  <input
                    value={it.targetReps}
                    onChange={(e) => updateItem(idx, { targetReps: e.target.value })}
                    placeholder="8-12"
                    className="min-h-[44px] w-full rounded-lg bg-zinc-950 px-2"
                  />
                </label>
              </div>
            </div>
          )
        })}
        {rt.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-500">
            Rotina vazia. Adicione exercícios abaixo.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <p className="mb-2 font-bold">Adicionar exercício</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
          className="min-h-[48px] w-full rounded-xl bg-zinc-950 px-3 outline-none"
        />
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => addExercise(e.id)}
              className="flex w-full items-center justify-between rounded-lg bg-zinc-950 px-3 py-2 text-left text-sm"
            >
              <span>{e.name}</span>
              <span className="text-lime-300">+ Add</span>
            </button>
          ))}
        </div>
        <Link to="/biblioteca" className="mt-2 block text-center text-sm text-zinc-400 underline">
          Não achou? Criar novo exercício →
        </Link>
      </div>
    </div>
  )
}

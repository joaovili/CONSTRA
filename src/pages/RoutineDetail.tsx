import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import type { Routine, RoutineItem } from '../lib/types'
import { uid } from '../lib/types'

export default function RoutineDetail() {
  const { id } = useParams()
  const isNew = !id || id === 'nova'
  const routine = useLiveQuery(() => (!isNew && id ? db.routines.get(id) : undefined), [id, isNew])

  if (isNew) return <RoutineEditor />
  if (!routine) return <p className="text-zinc-400">Carregando...</p>
  return <RoutineEditor key={routine.id} routine={routine} />
}

/** Mesma tela para criar (sem `routine`) e editar (com `routine`). */
function RoutineEditor({ routine }: { routine?: Routine }) {
  const navigate = useNavigate()
  const isNew = !routine
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [])
  const [name, setName] = useState(routine?.name ?? '')
  const [items, setItems] = useState<RoutineItem[]>(routine?.items ?? [])
  const [nameError, setNameError] = useState('')
  const [q, setQ] = useState('')

  const exById = new Map(exercises.map((e) => [e.id, e]))
  const filtered = exercises.filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 20)

  function applyItems(next: RoutineItem[]) {
    setItems(next)
    if (routine) void db.routines.update(routine.id, { items: next, updatedAt: Date.now() })
  }

  function addExercise(exerciseId: string) {
    const last = items[items.length - 1]
    applyItems([
      ...items,
      { exerciseId, targetSets: last?.targetSets ?? 3, targetReps: last?.targetReps ?? '10' },
    ])
  }

  function updateItem(idx: number, patch: Partial<RoutineItem>) {
    applyItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    applyItems(items.filter((_, i) => i !== idx))
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    applyItems(next)
  }

  async function finish() {
    const n = name.trim()
    if (!n) {
      setNameError('Dê um nome para a rotina para continuar.')
      return
    }
    setNameError('')
    if (routine) {
      await db.routines.update(routine.id, { name: n, items, updatedAt: Date.now() })
      navigate('/', { state: { flash: `Rotina "${n}" salva` } })
    } else {
      const now = Date.now()
      await db.routines.add({ id: uid('rt_'), name: n, items, createdAt: now, updatedAt: now })
      navigate('/', { state: { flash: `Rotina "${n}" criada` } })
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-sm text-zinc-400">
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-extrabold">{isNew ? 'Nova rotina' : 'Editar rotina'}</h1>

      <div>
        <label htmlFor="routine-name" className="text-xs font-bold tracking-wide text-zinc-500">
          NOME
        </label>
        <input
          id="routine-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (nameError) setNameError('')
          }}
          onBlur={() => routine && name.trim() && db.routines.update(routine.id, { name: name.trim(), updatedAt: Date.now() })}
          placeholder="ex: Push A"
          aria-invalid={nameError ? true : undefined}
          className={`mt-1 min-h-[48px] w-full rounded-xl border bg-zinc-900 px-3 outline-none focus:border-lime-400 ${
            nameError ? 'border-red-500' : 'border-zinc-800'
          }`}
        />
        {nameError && (
          <p role="alert" className="mt-1 text-sm font-medium text-red-400">
            {nameError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold tracking-wide text-zinc-500">EXERCÍCIOS</p>
        {items.map((it, idx) => {
          const ex = exById.get(it.exerciseId)
          return (
            <div key={`${idx}-${it.exerciseId}`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{ex?.name ?? '(exercício removido)'}</p>
                  <p className="text-xs text-zinc-500">
                    {ex?.muscleGroup} • {ex?.equipment}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => move(idx, -1)}
                    aria-label="Mover para cima"
                    className="inline-flex items-center rounded bg-zinc-800 px-2 py-1"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    aria-label="Mover para baixo"
                    className="inline-flex items-center rounded bg-zinc-800 px-2 py-1"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    onClick={() => removeItem(idx)}
                    aria-label="Remover exercício"
                    className="inline-flex items-center rounded bg-zinc-800 px-2 py-1"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  Séries
                  <SetsInput value={it.targetSets} onCommit={(n) => updateItem(idx, { targetSets: n })} />
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
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-500">
            Nenhum exercício ainda. Adicione abaixo.
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
          {filtered.length === 0 && <p className="px-1 text-sm text-zinc-500">Nada encontrado.</p>}
        </div>
        <Link
          to="/biblioteca"
          className="mt-2 flex items-center justify-center gap-1 text-center text-sm text-zinc-400 underline"
        >
          Não achou? Criar novo exercício <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <button onClick={finish} className="w-full rounded-xl bg-lime-400 py-3 font-extrabold text-black">
          {isNew ? 'Criar rotina' : 'Concluir'}
        </button>
      </div>
    </div>
  )
}

/** Input de séries que permite limpar o campo antes de digitar o valor. */
function SetsInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
        setText(digits)
        if (digits) onCommit(Number(digits))
      }}
      onBlur={() => setText(String(value || 1))}
      aria-label="Séries"
      className="min-h-[44px] w-full rounded-lg bg-zinc-950 px-2"
    />
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Dumbbell, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import ExerciseInfo from '../components/ExerciseInfo'
import { db } from '../lib/db'
import type { Equipment, Exercise, MuscleGroup } from '../lib/types'
import { MUSCLE_GROUPS, uid } from '../lib/types'

const MUSCLES = MUSCLE_GROUPS
const EQUIPS: Equipment[] = ['Barra', 'Haltere', 'Máquina', 'Cabo', 'Peso corporal', 'Kettlebell', 'Outro']

export default function Library() {
  const navigate = useNavigate()
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string>('Todas')
  const [name, setName] = useState('')
  const [mg, setMg] = useState<MuscleGroup>('Peito')
  const [eq, setEq] = useState<Equipment>('Haltere')
  const [uni, setUni] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [infoEx, setInfoEx] = useState<Exercise | null>(null)

  const all = exercises ?? []

  const filtered = all.filter((e) => {
    if (muscle !== 'Todas' && e.muscleGroup !== muscle) return false
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  // A base tem ~1500 itens: renderiza um pedaço e deixa o resto para a busca.
  const shown = filtered.slice(0, 100)

  async function create() {
    const n = name.trim()
    if (!n) return
    await db.exercises.add({ id: uid('ex_'), name: n, muscleGroup: mg, equipment: eq, unilateral: uni, createdAt: Date.now() })
    setName('')
    setShowForm(false)
  }

  async function remove() {
    if (!pendingId) return
    await db.exercises.delete(pendingId)
    setPendingId(null)
  }

  const pendingEx = pendingId ? (exercises ?? []).find((e) => e.id === pendingId) : undefined

  return (
    <div className="space-y-4">
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="inline-flex items-center gap-1 text-sm text-zinc-400"
      >
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Exercícios</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className="inline-flex items-center gap-1.5 rounded-xl bg-lime-400 px-3 py-2.5 text-sm font-extrabold text-black"
        >
          <Plus className="size-4" /> Novo
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="mb-2 font-bold">Novo exercício</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (ex: Supino reto)"
            autoFocus
            className="min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 outline-none focus:border-lime-400"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select value={mg} onChange={(e) => setMg(e.target.value as MuscleGroup)} className="min-h-[48px] rounded-xl bg-zinc-950 px-2">
              {MUSCLES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select value={eq} onChange={(e) => setEq(e.target.value as Equipment)} className="min-h-[48px] rounded-xl bg-zinc-950 px-2">
              {EQUIPS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={uni} onChange={(e) => setUni(e.target.checked)} className="size-5" />
            Unilateral (cada lado)
          </label>
          <div className="mt-3 flex gap-2">
            <button onClick={create} className="flex-1 rounded-xl bg-lime-400 py-3 font-extrabold text-black">
              Adicionar
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl bg-zinc-800 px-4 font-bold text-zinc-300">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (ex: supino)"
          aria-label="Buscar exercício"
          className="min-h-[48px] flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 outline-none placeholder:text-zinc-600 focus:border-lime-400"
        />
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          aria-label="Filtrar por grupo muscular"
          className="min-h-[48px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold outline-none focus:border-lime-400 sm:w-56"
        >
          <option value="Todas">Todos os grupos</option>
          {MUSCLES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-zinc-500">
        {filtered.length} {filtered.length === 1 ? 'exercício' : 'exercícios'}
        {shown.length < filtered.length ? ' • mostrando os 100 primeiros' : ''}
      </p>

      <div className="space-y-2">
        {shown.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <button
              onClick={() => setInfoEx(e)}
              aria-label={`Ver execução de ${e.name}`}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              {e.gifUrl ? (
                <img
                  src={e.gifUrl}
                  alt=""
                  loading="lazy"
                  className="size-14 shrink-0 rounded-lg bg-zinc-950 object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-zinc-600">
                  <Dumbbell className="size-6" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold capitalize leading-tight">{e.name}</span>
                <span className="block text-xs text-zinc-500">
                  {e.muscleGroup} • {e.equipment}
                  {e.unilateral ? ' • unilateral' : ''}
                </span>
              </span>
            </button>
            <button
              onClick={() => setPendingId(e.id)}
              aria-label="Excluir exercício"
              className="inline-flex shrink-0 items-center rounded-lg bg-zinc-800 px-2 py-1 text-sm"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-zinc-500">Nada encontrado.</p>}
      </div>

      <ConfirmDialog
        open={pendingId !== null}
        title="Excluir exercício?"
        description={
          pendingEx ? (
            <>
              <span className="font-bold text-zinc-200">{pendingEx.name}</span>
              <br />
              {pendingEx.muscleGroup} • {pendingEx.equipment}
              <br />
              Séries já registradas serão mantidas no histórico.
            </>
          ) : undefined
        }
        confirmLabel="Excluir exercício"
        onConfirm={remove}
        onClose={() => setPendingId(null)}
      />

      <ExerciseInfo exercise={infoEx} onClose={() => setInfoEx(null)} />
    </div>
  )
}

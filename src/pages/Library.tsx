import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { db } from '../lib/db'
import type { Equipment, MuscleGroup } from '../lib/types'
import { uid } from '../lib/types'

const MUSCLES: MuscleGroup[] = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Core', 'Glúteos', 'Corpo todo']
const EQUIPS: Equipment[] = ['Barra', 'Haltere', 'Máquina', 'Cabo', 'Peso corporal', 'Kettlebell', 'Outro']

export default function Library() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string>('Todas')
  const [name, setName] = useState('')
  const [mg, setMg] = useState<MuscleGroup>('Peito')
  const [eq, setEq] = useState<Equipment>('Haltere')
  const [uni, setUni] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = (exercises ?? []).filter((e) => {
    if (muscle !== 'Todas' && e.muscleGroup !== muscle) return false
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  async function create() {
    const n = name.trim()
    if (!n) return
    await db.exercises.add({ id: uid('ex_'), name: n, muscleGroup: mg, equipment: eq, unilateral: uni, createdAt: Date.now() })
    setName('')
  }

  async function remove() {
    if (!pendingId) return
    await db.exercises.delete(pendingId)
    setPendingId(null)
  }

  const pendingEx = pendingId ? (exercises ?? []).find((e) => e.id === pendingId) : undefined

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Exercícios</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar (ex: supino)"
        className="min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 outline-none placeholder:text-zinc-600 focus:border-lime-400"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['Todas', ...MUSCLES].map((m) => (
          <button
            key={m}
            onClick={() => setMuscle(m)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${muscle === m ? 'bg-lime-400 text-black' : 'bg-zinc-900 text-zinc-400'}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <div>
              <p className="font-semibold leading-tight">{e.name}</p>
              <p className="text-xs text-zinc-500">
                {e.muscleGroup} • {e.equipment}
                {e.unilateral ? ' • unilateral' : ''}
              </p>
            </div>
            <button onClick={() => setPendingId(e.id)} className="rounded-lg bg-zinc-800 px-2 py-1 text-sm">
              🗑
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-zinc-500">Nada encontrado.</p>}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <p className="mb-2 font-bold">+ Novo exercício</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex: Supino reto)"
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
        <button onClick={create} className="mt-3 w-full rounded-xl bg-lime-400 py-3 font-extrabold text-black">
          Adicionar
        </button>
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
    </div>
  )
}

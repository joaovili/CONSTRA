import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RestTimer from '../components/RestTimer'
import { db, getSettings } from '../lib/db'
import { detectPR, lastLoad, suggestNext } from '../lib/stats'
import { SET_KIND_LABEL, uid, type SetEntry, type SetKind } from '../lib/types'

export default function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id])
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const routines = useLiveQuery(() => db.routines.toArray())
  const allSessions = useLiveQuery(() => db.sessions.toArray())
  const settings = useLiveQuery(() => getSettings())
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const exById = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises])
  const routine = useMemo(
    () => (session?.routineId ? (routines ?? []).find((r) => r.id === ss.routineId) : undefined),
    [routines, session],
  )

  // exercícios da sessão = da rotina + extras adicionados
  const exerciseIds = useMemo(() => {
    if (!session) return []
    const fromRoutine = routine?.items.map((i) => i.exerciseId) ?? []
    const fromSets = ss.sets.map((s) => s.exerciseId)
    const ordered: string[] = []
    for (const eid of [...fromRoutine, ...fromSets]) {
      if (!ordered.includes(eid)) ordered.push(eid)
    }
    return ordered
  }, [session, routine])

  if (!session) return <p className="text-zinc-400">Carregando sessão...</p>
  const ss = session

  const unit = settings?.unit ?? 'kg'

  function setsOf(exerciseId: string) {
    return ss.sets
      .map((s, globalIdx) => ({ ...s, globalIdx }))
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.setIndex - b.setIndex)
  }

  async function persistSets(sets: SetEntry[]) {
    await db.sessions.update(ss.id, { sets })
  }

  async function addSet(exerciseId: string) {
    const prev = lastLoad(allSessions ?? [], exerciseId)
    const existing = setsOf(exerciseId)
    const next: SetEntry = {
      id: uid('set_'),
      exerciseId,
      setIndex: existing.length + 1,
      kind: 'normal',
      weight: prev?.weight ?? 0,
      reps: prev?.reps ?? 10,
      done: false,
      createdAt: Date.now(),
    }
    await persistSets([...ss.sets, next])
  }

  async function updateSet(globalIdx: number, patch: Partial<SetEntry>) {
    const sets = ss.sets.map((s, i) => (i === globalIdx ? { ...s, ...patch } : s))
    await persistSets(sets)
  }

  async function removeSet(globalIdx: number) {
    const sets = ss.sets.filter((_, i) => i !== globalIdx)
    // reindexa por exercício
    const counters = new Map<string, number>()
    for (const s of sets) {
      const n = (counters.get(s.exerciseId) ?? 0) + 1
      counters.set(s.exerciseId, n)
      s.setIndex = n
    }
    await persistSets(sets)
  }

  async function addExerciseToSession(exerciseId: string) {
    setShowAdd(false)
    setQ('')
    // cria primeira série já
    const prev = lastLoad(allSessions ?? [], exerciseId)
    await persistSets([
      ...ss.sets,
      {
        id: uid('set_'),
        exerciseId,
        setIndex: setsOf(exerciseId).length + 1,
        kind: 'normal',
        weight: prev?.weight ?? 0,
        reps: prev?.reps ?? 10,
        done: false,
        createdAt: Date.now(),
      },
    ])
  }

  async function finish() {
    await db.sessions.update(ss.id, { finishedAt: Date.now() })
    navigate('/')
  }

  const filteredExercises = (exercises ?? [])
    .filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 15)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-sm text-zinc-400">
          ← Sair (salva auto)
        </button>
        <span className="text-xs text-zinc-500">{new Date(ss.startedAt).toLocaleString('pt-BR')}</span>
      </div>

      <h1 className="text-2xl font-extrabold">{ss.routineName}</h1>

      <RestTimer defaultSeconds={settings?.restSeconds ?? 90} />

      <div className="space-y-4">
        {exerciseIds.map((eid) => {
          const ex = exById.get(eid)
          const sets = setsOf(eid)
          const target = routine?.items.find((i) => i.exerciseId === eid)
          const suggestion = suggestNext(allSessions ?? [], eid)
          return (
            <div key={eid} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-extrabold leading-tight">{ex?.name ?? 'Exercício'}</p>
                  <p className="text-xs text-zinc-500">
                    {target ? `Meta: ${target.targetSets}×${target.targetReps}` : 'Avulso'}
                    {suggestion ? ` • Última: ${suggestion.weight}×${suggestion.reps - 1}` : ''}
                  </p>
                  {suggestion && (
                    <p className="mt-1 text-xs text-lime-300/90">💡 {suggestion.hint}</p>
                  )}
                </div>
                <button
                  onClick={() => addSet(eid)}
                  className="shrink-0 rounded-xl bg-lime-400 px-3 py-2 text-sm font-extrabold text-black"
                >
                  + Série
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {sets.map((s) => {
                  const pr = s.done ? detectPR((allSessions ?? []).filter((x) => x.id !== ss.id), eid, s.weight, s.reps) : { isPR: false }
                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl border p-2 ${s.done ? 'border-lime-500/40 bg-lime-500/5' : 'border-zinc-800 bg-zinc-950'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${s.done ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
                          {s.setIndex}
                        </span>
                        <select
                          value={s.kind}
                          onChange={(e) => updateSet(s.globalIdx, { kind: e.target.value as SetKind })}
                          className="h-[48px] shrink-0 rounded-lg bg-zinc-900 px-1 text-xs"
                        >
                          {(Object.keys(SET_KIND_LABEL) as SetKind[]).map((k) => (
                            <option key={k} value={k}>
                              {SET_KIND_LABEL[k]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min={0}
                          value={Number.isFinite(s.weight) ? s.weight : 0}
                          onChange={(e) => updateSet(s.globalIdx, { weight: Number(e.target.value) })}
                          className="h-[48px] w-full min-w-0 rounded-lg bg-zinc-900 px-2 text-center text-lg font-bold"
                          aria-label="Peso"
                        />
                        <span className="shrink-0 text-xs text-zinc-500">{unit}</span>
                        <span className="shrink-0 text-zinc-600">×</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={s.reps}
                          onChange={(e) => updateSet(s.globalIdx, { reps: Number(e.target.value) })}
                          className="h-[48px] w-full min-w-0 rounded-lg bg-zinc-900 px-2 text-center text-lg font-bold"
                          aria-label="Reps"
                        />
                        <span className="shrink-0 text-xs text-zinc-500">reps</span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => updateSet(s.globalIdx, { done: !s.done })}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-extrabold ${s.done ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-200'}`}
                        >
                          {s.done ? '✓ Feita' : 'Marcar feita'}
                        </button>
                        <button onClick={() => removeSet(s.globalIdx)} className="rounded-lg bg-zinc-800 px-3 text-sm">
                          🗑
                        </button>
                      </div>
                      {pr.isPR && (
                        <p className="mt-1 text-center text-xs font-bold text-amber-300">🏆 {pr.detail}</p>
                      )}
                    </div>
                  )
                })}
                {sets.length === 0 && (
                  <button onClick={() => addSet(eid)} className="w-full rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-400">
                    + Adicionar primeira série
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-bold">
            + Adicionar exercício na sessão
          </button>
        ) : (
          <div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar exercício..."
              autoFocus
              className="min-h-[48px] w-full rounded-xl bg-zinc-950 px-3 outline-none"
            />
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {filteredExercises.map((e) => (
                <button key={e.id} onClick={() => addExerciseToSession(e.id)} className="flex w-full justify-between rounded-lg bg-zinc-950 px-3 py-2.5 text-left text-sm">
                  <span>{e.name}</span>
                  <span className="text-lime-300">+ Add</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdd(false)} className="mt-2 w-full text-sm text-zinc-500">
              Fechar
            </button>
          </div>
        )}
      </div>

      <button onClick={finish} className="w-full rounded-2xl bg-lime-400 py-4 font-extrabold text-black">
        {ss.finishedAt ? '✓ Treino concluído (ver início)' : 'Concluir treino'}
      </button>
      {ss.finishedAt && (
        <button
          onClick={() => db.sessions.update(ss.id, { finishedAt: undefined })}
          className="w-full text-sm text-zinc-500 underline"
        >
          Reabrir treino
        </button>
      )}
    </div>
  )
}

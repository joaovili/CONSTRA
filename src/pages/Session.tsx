import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Lightbulb, Plus, Trash2, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import RestTimer from '../components/RestTimer'
import WorkoutTimer from '../components/WorkoutTimer'
import { db, ensureSettings } from '../lib/db'
import { detectPR, lastLoad, suggestNext, type PRInfo } from '../lib/stats'
import { SET_KIND_LABEL, uid, type SetEntry, type SetKind, type WorkoutSession } from '../lib/types'

/**
 * Loader: busca a sessão e só renderiza a view quando ela existe.
 * A view recebe `session` não-nula por props — impossível de
 * referenciar antes de inicializar (classe de bug que já nos queimou).
 */
export default function SessionPage() {
  const { id } = useParams()
  const session = useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id])

  if (!session) return <p className="text-zinc-400">Carregando sessão...</p>
  return <SessionView key={session.id} session={session} />
}

function SessionView({ session }: { session: WorkoutSession }) {
  const navigate = useNavigate()
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [])
  const routines = useLiveQuery(() => db.routines.toArray(), [], [])
  const allSessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const settings = useLiveQuery(() => db.settings.get('app'))

  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    ensureSettings()
  }, [])

  const unit = settings?.unit ?? 'kg'
  const exById = new Map(exercises.map((e) => [e.id, e]))
  const routine = session.routineId ? routines.find((r) => r.id === session.routineId) : undefined

  // Exercícios da sessão = os da rotina + extras adicionados avulsos, sem repetir.
  const exerciseIds: string[] = []
  for (const eid of [...(routine?.items.map((i) => i.exerciseId) ?? []), ...session.sets.map((s) => s.exerciseId)]) {
    if (!exerciseIds.includes(eid)) exerciseIds.push(eid)
  }

  function setsOf(exerciseId: string) {
    return session.sets
      .map((s, globalIdx) => ({ ...s, globalIdx }))
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.setIndex - b.setIndex)
  }

  async function persistSets(sets: SetEntry[]) {
    await db.sessions.update(session.id, { sets })
  }

  function blankSet(exerciseId: string, setIndex: number): SetEntry {
    const prev = lastLoad(allSessions, exerciseId)
    return {
      id: uid('set_'),
      exerciseId,
      setIndex,
      kind: 'normal',
      weight: prev?.weight ?? 0,
      reps: prev?.reps ?? 10,
      done: false,
      createdAt: Date.now(),
    }
  }

  async function addSet(exerciseId: string) {
    setCollapsed((c) => ({ ...c, [exerciseId]: false }))
    await persistSets([...session.sets, blankSet(exerciseId, setsOf(exerciseId).length + 1)])
  }

  async function updateSet(globalIdx: number, patch: Partial<SetEntry>) {
    await persistSets(session.sets.map((s, i) => (i === globalIdx ? { ...s, ...patch } : s)))
  }

  async function removeSet(globalIdx: number) {
    const counters = new Map<string, number>()
    const sets = session.sets
      .filter((_, i) => i !== globalIdx)
      .map((s) => {
        const n = (counters.get(s.exerciseId) ?? 0) + 1
        counters.set(s.exerciseId, n)
        return { ...s, setIndex: n }
      })
    await persistSets(sets)
  }

  async function addExerciseToSession(exerciseId: string) {
    setShowAdd(false)
    setQ('')
    setCollapsed((c) => ({ ...c, [exerciseId]: false }))
    await persistSets([...session.sets, blankSet(exerciseId, setsOf(exerciseId).length + 1)])
  }

  async function finish() {
    await db.sessions.update(session.id, { finishedAt: Date.now() })
    navigate('/')
  }

  async function deleteThisSession() {
    await db.sessions.delete(session.id)
    navigate('/')
  }

  const doneCount = session.sets.filter((s) => s.done).length
  const filteredExercises = exercises
    .filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 15)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-sm text-zinc-400">
          <ArrowLeft className="size-4" /> Sair (salva auto)
        </button>
        <span className="text-xs text-zinc-500">{new Date(session.startedAt).toLocaleString('pt-BR')}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">{session.routineName}</h1>
        <WorkoutTimer startedAt={session.startedAt} finishedAt={session.finishedAt} />
      </div>

      <RestTimer defaultSeconds={settings?.restSeconds ?? 90} />

      <div className="space-y-4">
        {exerciseIds.map((eid) => {
          const ex = exById.get(eid)
          const sets = setsOf(eid)
          const target = routine?.items.find((i) => i.exerciseId === eid)
          const suggestion = suggestNext(allSessions, eid)
          const isCollapsed = collapsed[eid] ?? true
          const doneSets = sets.filter((s) => s.done)
          const top = doneSets.reduce<{ weight: number; reps: number } | null>(
            (best, s) =>
              !best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)
                ? { weight: s.weight, reps: s.reps }
                : best,
            null,
          )
          return (
            <div key={eid} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [eid]: !isCollapsed }))}
                  aria-expanded={!isCollapsed}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="flex items-center font-extrabold leading-tight">
                    {isCollapsed ? (
                      <ChevronRight className="mr-1 size-4 shrink-0 text-zinc-500" />
                    ) : (
                      <ChevronDown className="mr-1 size-4 shrink-0 text-zinc-500" />
                    )}
                    {ex?.name ?? 'Exercício removido'}
                  </p>
                  {isCollapsed ? (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {doneSets.length}/{sets.length} feitas
                      {top ? ` • top ${top.weight}×${top.reps}` : ''}
                      {target ? ` • meta ${target.targetSets}×${target.targetReps}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      {target ? `Meta: ${target.targetSets}×${target.targetReps}` : 'Avulso'}
                      {suggestion ? ` • Última: ${suggestion.weight}×${suggestion.reps}` : ''}
                    </p>
                  )}
                </button>
                <button
                  onClick={() => addSet(eid)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-lime-400 px-3 py-2 text-sm font-extrabold text-black"
                >
                  <Plus className="size-4" /> Série
                </button>
              </div>
              {isCollapsed ? null : (
              <>
                {suggestion && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-lime-300/90">
                    <Lightbulb className="size-3.5 shrink-0" /> {suggestion.hint}
                  </p>
                )}

              <div className="mt-3 space-y-2">
                {sets.map((s) => {
                  const pr: PRInfo = s.done
                    ? detectPR(
                        allSessions.filter((x) => x.id !== session.id),
                        eid,
                        s.weight,
                        s.reps,
                      )
                    : { isPR: false }
                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl border p-2 ${s.done ? 'border-lime-500/40 bg-lime-500/5' : 'border-zinc-800 bg-zinc-950'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${s.done ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
                        >
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
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-extrabold ${s.done ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-200'}`}
                        >
                          {s.done && <Check className="size-4" />}
                          {s.done ? 'Feita' : 'Marcar feita'}
                        </button>
                        <button
                          onClick={() => removeSet(s.globalIdx)}
                          aria-label="Remover série"
                          className="inline-flex items-center rounded-lg bg-zinc-800 px-3 text-sm"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {pr.isPR && pr.detail && (
                        <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs font-bold text-amber-300">
                          <Trophy className="size-3.5" /> {pr.detail}
                        </p>
                      )}
                    </div>
                  )
                })}
                {sets.length === 0 && (
                  <button
                    onClick={() => addSet(eid)}
                    className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-400"
                  >
                    <Plus className="size-4" /> Adicionar primeira série
                  </button>
                )}
              </div>
              </>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="flex w-full items-center justify-center gap-1 rounded-xl bg-zinc-800 py-3 text-sm font-bold"
          >
            <Plus className="size-4" /> Adicionar exercício na sessão
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
                <button
                  key={e.id}
                  onClick={() => addExerciseToSession(e.id)}
                  className="flex w-full justify-between rounded-lg bg-zinc-950 px-3 py-2.5 text-left text-sm"
                >
                  <span>{e.name}</span>
                  <span className="inline-flex items-center gap-0.5 text-lime-300">
                    <Plus className="size-4" /> Add
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdd(false)} className="mt-2 w-full text-sm text-zinc-500">
              Fechar
            </button>
          </div>
        )}
      </div>

      <button
        onClick={finish}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-lime-400 py-4 font-extrabold text-black"
      >
        {session.finishedAt && <Check className="size-5" />}
        {session.finishedAt ? 'Treino concluído (ver início)' : 'Concluir treino'}
      </button>
      {session.finishedAt && (
        <button
          onClick={() => db.sessions.update(session.id, { finishedAt: undefined })}
          className="w-full text-sm text-zinc-500 underline"
        >
          Reabrir treino
        </button>
      )}
      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full rounded-xl border border-red-900 py-3 text-sm font-bold text-red-400"
      >
        Excluir este treino
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir treino?"
        description={
          <>
            <span className="font-bold text-zinc-200">{session.routineName}</span>
            <br />
            {new Date(session.startedAt).toLocaleString('pt-BR')}
            <br />
            {doneCount} séries feitas serão apagadas.
            <br />
            <span className="text-red-300">Não dá pra desfazer.</span>
          </>
        }
        confirmLabel="Excluir treino"
        onConfirm={deleteThisSession}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

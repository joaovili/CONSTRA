import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, GripVertical, Play, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import { db } from '../lib/db'
import { seedIfEmpty } from '../lib/seeds'
import { uid, type Routine } from '../lib/types'

interface PendingDelete {
  kind: 'session' | 'routine'
  id: string
}

function sortRoutines(list: Routine[]): Routine[] {
  return [...list].sort((a, b) => {
    const ao = a.order ?? -1
    const bo = b.order ?? -1
    if (ao !== bo) return ao - bo
    return b.updatedAt - a.updatedAt
  })
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const routinesRaw = useLiveQuery(() => db.routines.toArray())
  const routines = useMemo(() => sortRoutines(routinesRaw ?? []), [routinesRaw])
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().limit(5).toArray())
  const [seeding, setSeeding] = useState(true)
  const [flash, setFlash] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)

  const orderedRoutines = useMemo(() => {
    if (!dragOrder) return routines
    const byId = new Map(routines.map((r) => [r.id, r]))
    return dragOrder.map((id) => byId.get(id)).filter((r): r is Routine => !!r)
  }, [routines, dragOrder])

  function startDrag(e: ReactPointerEvent, id: string) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragId(id)
    setDragOrder(routines.map((r) => r.id))
  }

  function moveDrag(e: ReactPointerEvent) {
    if (!dragId) return
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-card-id]') as HTMLElement | null
    const overId = el?.dataset.cardId
    if (!overId || overId === dragId) return
    setDragOrder((prev) => {
      if (!prev) return prev
      const from = prev.indexOf(dragId)
      const to = prev.indexOf(overId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, dragId)
      return next
    })
  }

  async function endDrag() {
    if (dragOrder) {
      await db.transaction('rw', db.routines, async () => {
        for (let i = 0; i < dragOrder.length; i++) await db.routines.update(dragOrder[i], { order: i })
      })
    }
    setDragId(null)
    setDragOrder(null)
  }

  useEffect(() => {
    seedIfEmpty().finally(() => setSeeding(false))
  }, [])

  useEffect(() => {
    const state = location.state as { flash?: string } | null
    if (state?.flash) {
      setFlash(state.flash)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), 5000)
    return () => clearTimeout(timer)
  }, [flash])

  const totalSessions = useLiveQuery(() => db.sessions.count(), [], 0)

  const lastByRoutine = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions ?? []) {
      if (s.routineId && !map.has(s.routineId)) map.set(s.routineId, s.startedAt)
    }
    return map
  }, [sessions])

  async function startSession(routine?: Routine) {
    const id = uid('ws_')
    await db.sessions.add({
      id,
      routineId: routine?.id,
      routineName: routine?.name ?? 'Treino livre',
      startedAt: Date.now(),
      sets: [],
    })
    navigate(`/sessao/${id}`)
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return
    if (pendingDelete.kind === 'routine') {
      await db.routines.delete(pendingDelete.id)
    } else {
      await db.sessions.delete(pendingDelete.id)
    }
    setPendingDelete(null)
  }

  const pendingSession = pendingDelete?.kind === 'session'
    ? (sessions ?? []).find((s) => s.id === pendingDelete.id)
    : undefined
  const pendingRoutine = pendingDelete?.kind === 'routine'
    ? (routines ?? []).find((r) => r.id === pendingDelete.id)
    : undefined

  if (seeding) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">CONSTRA</h1>
        <p className="text-sm text-zinc-400">
          {totalSessions ?? 0} treinos registrados • anote carga e veja a progressão
        </p>
      </header>

      <button
        onClick={() => startSession(undefined)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 py-4 text-base font-extrabold text-black active:scale-[0.99]"
      >
        <Plus className="size-5" /> Treino livre (sem rotina)
      </button>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Minhas rotinas</h2>
          <span className="text-xs text-zinc-500">{routines?.length ?? 0}</span>
        </div>

        <Link
          to="/rotina/nova"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3 font-bold text-zinc-200"
        >
          <Plus className="size-4" /> Nova rotina
        </Link>

        <div className="space-y-2">
          {orderedRoutines.map((r) => (
            <div
              key={r.id}
              data-card-id={r.id}
              className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-3 ${dragId === r.id ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-1">
                <button
                  onPointerDown={(e) => startDrag(e, r.id)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  aria-label="Arrastar para reordenar"
                  className="touch-none shrink-0 cursor-grab rounded-lg p-2 text-zinc-500 active:cursor-grabbing"
                >
                  <GripVertical className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.name}</p>
                  <p className="text-xs text-zinc-400">
                    {r.items.length} exercícios
                    {lastByRoutine.get(r.id)
                      ? ` • último: ${new Date(lastByRoutine.get(r.id)!).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link to={`/rotina/${r.id}`} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold">
                    Editar
                  </Link>
                  <button
                    onClick={() => setPendingDelete({ kind: 'routine', id: r.id })}
                    aria-label="Excluir rotina"
                    className="inline-flex items-center rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => startSession(r)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400/15 py-3 text-sm font-extrabold text-lime-300 active:bg-lime-400 active:text-black"
              >
                <Play className="size-4" /> Iniciar {r.name}
              </button>
            </div>
          ))}
          {routines.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-500">
              Nenhuma rotina ainda. Toque em "Nova rotina" para montar a sua.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold">Últimos treinos</h2>
        {(sessions ?? []).map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <Link to={`/sessao/${s.id}`} className="min-w-0 flex-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{s.routineName}</span>
                <span className="shrink-0 text-zinc-400">{new Date(s.startedAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-xs text-zinc-500">
                {s.sets.filter((x) => x.done).length} séries •{' '}
                {s.finishedAt ? `concluído` : 'em andamento'}
              </p>
            </Link>
            <button
              onClick={() => setPendingDelete({ kind: 'session', id: s.id })}
              aria-label="Excluir treino"
              className="inline-flex shrink-0 items-center rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </section>

      {flash && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-20 z-20 mx-auto flex max-w-md items-center gap-3 px-4"
        >
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-lime-500/30 bg-zinc-900 p-3 shadow-lg">
            <CheckCircle2 className="size-5 shrink-0 text-lime-300" />
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{flash}</p>
            <button
              onClick={() => setFlash(null)}
              aria-label="Fechar aviso"
              className="shrink-0 rounded-lg bg-zinc-800 p-2 text-zinc-400"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.kind === 'routine' ? 'Excluir rotina?' : 'Excluir treino?'}
        description={
          pendingSession ? (
            <>
              <span className="font-bold text-zinc-200">{pendingSession.routineName}</span>
              <br />
              {new Date(pendingSession.startedAt).toLocaleString('pt-BR')}
              <br />
              {pendingSession.sets.filter((x) => x.done).length} séries feitas serão apagadas.
              <br />
              <span className="text-red-300">Não dá pra desfazer.</span>
            </>
          ) : pendingRoutine ? (
            <>
              <span className="font-bold text-zinc-200">{pendingRoutine.name}</span>
              <br />
              {pendingRoutine.items.length} exercícios na rotina.
              <br />
              Treinos já registrados serão mantidos.
            </>
          ) : undefined
        }
        confirmLabel={pendingDelete?.kind === 'routine' ? 'Excluir rotina' : 'Excluir treino'}
        onConfirm={confirmPendingDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

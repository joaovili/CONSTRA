import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import { db } from '../lib/db'
import { seedIfEmpty } from '../lib/seeds'
import { uid, type Routine } from '../lib/types'
import { useEffect } from 'react'

interface PendingDelete {
  kind: 'session' | 'routine'
  id: string
}

export default function Home() {
  const navigate = useNavigate()
  const routines = useLiveQuery(() => db.routines.orderBy('updatedAt').reverse().toArray())
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().limit(5).toArray())
  const [seeding, setSeeding] = useState(true)
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  useEffect(() => {
    seedIfEmpty().finally(() => setSeeding(false))
  }, [])

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

  async function createRoutine() {
    const name = newName.trim() || `Treino ${((routines?.length ?? 0) + 1)}`
    const id = uid('rt_')
    const now = Date.now()
    await db.routines.add({ id, name, items: [], createdAt: now, updatedAt: now })
    setNewName('')
    navigate(`/rotina/${id}`)
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
        <h1 className="text-2xl font-extrabold tracking-tight">💪 Logbook</h1>
        <p className="text-sm text-zinc-400">
          {totalSessions ?? 0} treinos registrados • anote carga e veja a progressão
        </p>
      </header>

      <button
        onClick={() => startSession(undefined)}
        className="w-full rounded-2xl bg-lime-400 py-4 text-base font-extrabold text-black active:scale-[0.99]"
      >
        + Treino livre (sem rotina)
      </button>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Minhas rotinas</h2>
          <span className="text-xs text-zinc-500">{routines?.length ?? 0}</span>
        </div>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da nova rotina (ex: Push A)"
            className="min-h-[48px] flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base outline-none placeholder:text-zinc-600 focus:border-lime-400"
          />
          <button onClick={createRoutine} className="rounded-xl bg-zinc-100 px-4 font-bold text-black">
            Criar
          </button>
        </div>

        <div className="space-y-2">
          {(routines ?? []).map((r) => (
            <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
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
                  <button onClick={() => setPendingDelete({ kind: 'routine', id: r.id })} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm">
                    🗑
                  </button>
                </div>
              </div>
              <button
                onClick={() => startSession(r)}
                className="mt-3 w-full rounded-xl bg-lime-400/15 py-3 text-sm font-extrabold text-lime-300 active:bg-lime-400 active:text-black"
              >
                ▶ Iniciar {r.name}
              </button>
            </div>
          ))}
          {(routines?.length ?? 0) === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-500">
              Nenhuma rotina ainda. Crie uma acima ou use os templates que já vieram instalados.
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
              className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            >
              🗑
            </button>
          </div>
        ))}
      </section>

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

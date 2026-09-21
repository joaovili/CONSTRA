import { useLiveQuery } from 'dexie-react-hooks'
import { Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import { db } from '../lib/db'
import { formatDuration, formatPace, paceMinPerKm, trainingLoad } from '../lib/stats'
import { effortLabel, feelLabel, type CardioSession } from '../lib/types'

export default function Cardio() {
  const navigate = useNavigate()
  const location = useLocation()
  const sessions = useLiveQuery(() => db.cardio.orderBy('startedAt').reverse().toArray())
  const [pendingDelete, setPendingDelete] = useState<CardioSession | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

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

  const totals = useMemo(() => {
    const list = sessions ?? []
    return {
      count: list.length,
      distance: list.reduce((a, s) => a + (s.distanceKm ?? 0), 0),
      duration: list.reduce((a, s) => a + (s.durationMin ?? 0), 0),
      load: list.reduce((a, s) => a + (trainingLoad(s.durationMin, s.effort) ?? 0), 0),
    }
  }, [sessions])

  // Pace da sessão anterior de cada atividade, para comparar o ritmo.
  const prevPaceByKind = useMemo(() => {
    const map = new Map<string, number>()
    const asc = [...(sessions ?? [])].sort((a, b) => a.startedAt - b.startedAt)
    const out = new Map<string, number>()
    for (const s of asc) {
      const prev = map.get(s.kind)
      if (prev != null) out.set(s.id, prev)
      const pace = paceMinPerKm(s.durationMin, s.distanceKm)
      if (pace != null) map.set(s.kind, pace)
    }
    return out
  }, [sessions])

  async function confirmDelete() {
    if (pendingDelete) await db.cardio.delete(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          Cardio <Activity className="size-6 text-lime-300" />
        </h1>
        <p className="text-sm text-zinc-400">
          Registre os números do treino e compare sua evolução ao longo do tempo
        </p>
      </header>

      <button
        onClick={() => navigate('/cardio/nova')}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 py-4 text-base font-extrabold text-black active:scale-[0.99]"
      >
        <Plus className="size-5" /> Registrar atividade
      </button>

      {totals.count > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Summary label="Atividades" value={String(totals.count)} />
          <Summary label="Distância" value={`${totals.distance.toFixed(1)} km`} />
          <Summary label="Tempo" value={formatDuration(totals.duration) ?? '—'} />
          <Summary label="Carga total" value={totals.load > 0 ? String(totals.load) : '—'} />
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Histórico</h2>
          <span className="text-xs text-zinc-500">{totals.count}</span>
        </div>

        {(sessions ?? []).map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            prevPace={prevPaceByKind.get(s.id)}
            onDelete={() => setPendingDelete(s)}
          />
        ))}

        {(sessions?.length ?? 0) === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-500">
            Nenhuma atividade ainda. Toque em "Registrar atividade" para começar.
          </p>
        )}
      </section>

      {flash && (
        <div role="status" className="fixed inset-x-0 bottom-20 z-20 mx-auto flex max-w-md items-center gap-3 px-4">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-lime-500/30 bg-zinc-900 p-3 shadow-lg">
            <CheckCircle2 className="size-5 shrink-0 text-lime-300" />
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{flash}</p>
            <button onClick={() => setFlash(null)} aria-label="Fechar aviso" className="shrink-0 rounded-lg bg-zinc-800 p-2 text-zinc-400">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir atividade?"
        description={
          pendingDelete ? (
            <>
              <span className="font-bold text-zinc-200">
                {pendingDelete.kind} · {pendingDelete.trainingType}
              </span>
              <br />
              {new Date(pendingDelete.startedAt).toLocaleString('pt-BR')}
              <br />
              <span className="text-red-300">Não dá pra desfazer.</span>
            </>
          ) : undefined
        }
        confirmLabel="Excluir atividade"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
    </div>
  )
}

function SessionRow({
  session,
  prevPace,
  onDelete,
}: {
  session: CardioSession
  prevPace?: number
  onDelete: () => void
}) {
  const pace = paceMinPerKm(session.durationMin, session.distanceKm)
  const paceText = formatPace(pace)
  const load = trainingLoad(session.durationMin, session.effort)
  const deltaSeconds = pace != null && prevPace != null ? Math.round((pace - prevPace) * 60) : null

  const numbers: string[] = []
  if (session.distanceKm) numbers.push(`${session.distanceKm} km`)
  if (session.durationMin) numbers.push(formatDuration(session.durationMin) ?? '')
  if (paceText) numbers.push(paceText)
  if (session.calories) numbers.push(`${session.calories} kcal`)

  const feels: string[] = []
  const effort = effortLabel(session.effort)
  const feel = feelLabel(session.feelAfter)
  if (effort) feels.push(`Esforço: ${effort}`)
  if (feel) feels.push(`Agora: ${feel}`)
  if (load) feels.push(`Carga ${load}`)

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
      <Link to={`/cardio/${session.id}`} className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-bold">
            {session.kind} <span className="font-normal text-zinc-400">· {session.trainingType}</span>
          </span>
          <span className="shrink-0 text-xs text-zinc-400">{new Date(session.startedAt).toLocaleDateString('pt-BR')}</span>
        </div>

        {numbers.length > 0 ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-zinc-300">
            {numbers.filter(Boolean).join(' • ')}
            {deltaSeconds != null && deltaSeconds !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${deltaSeconds < 0 ? 'text-lime-300' : 'text-red-300'}`}>
                {deltaSeconds < 0 ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                {Math.abs(deltaSeconds)}s
              </span>
            )}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-amber-300/90">Faltam tempo e distância para comparar evolução</p>
        )}

        {feels.length > 0 && <p className="mt-0.5 text-xs text-zinc-500">{feels.join(' • ')}</p>}
      </Link>
      <button
        onClick={onDelete}
        aria-label="Excluir atividade"
        className="inline-flex shrink-0 items-center rounded-lg bg-zinc-800 px-3 py-2 text-sm"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}

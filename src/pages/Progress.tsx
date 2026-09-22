import { useLiveQuery } from 'dexie-react-hooks'
import { TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../lib/db'
import { sortPlaces } from '../lib/places'
import { historyForExercise } from '../lib/stats'
import { MUSCLE_GROUPS } from '../lib/types'

type Metric = 'maxWeight' | 'volume' | 'best1RM'

const METRICS: Array<{ id: Metric; label: string }> = [
  { id: 'maxWeight', label: 'Carga máx' },
  { id: 'volume', label: 'Volume' },
  { id: 'best1RM', label: '1RM est.' },
]

export default function Progress() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').toArray())
  const settings = useLiveQuery(() => db.settings.get('app'))
  const placesRaw = useLiveQuery(() => db.places.toArray(), [], [])
  const places = useMemo(() => sortPlaces(placesRaw), [placesRaw])
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('Todas')
  const [selected, setSelected] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('maxWeight')
  const [placeFilter, setPlaceFilter] = useState<string | null>(null)

  const effectivePlace = placeFilter ?? settings?.currentPlaceId ?? 'all'
  const placeId = effectivePlace === 'all' ? undefined : effectivePlace

  const filtered = useMemo(
    () =>
      (exercises ?? [])
        .filter((e) => (group === 'Todas' || e.muscleGroup === group) && (!q || e.name.toLowerCase().includes(q.toLowerCase())))
        .slice(0, 50),
    [exercises, q, group],
  )

  const activeId = filtered.some((e) => e.id === selected) ? selected : filtered[0]?.id
  const activeEx = (exercises ?? []).find((e) => e.id === activeId)

  const hist = useMemo(
    () => (activeId && sessions ? historyForExercise(sessions, activeId, placeId) : null),
    [activeId, sessions, placeId],
  )

  const chartData = useMemo(
    () =>
      (hist?.sessions ?? []).map((h) => ({
        data: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        maxWeight: h.maxWeight,
        volume: Math.round(h.volume),
        best1RM: Math.round(h.best1RM * 10) / 10,
      })),
    [hist],
  )

  const best = useMemo(() => {
    if (!hist || hist.sessions.length === 0) return null
    return {
      maxWeight: Math.max(...hist.sessions.map((h) => h.maxWeight)),
      volume: Math.max(...hist.sessions.map((h) => h.volume)),
      sessions: hist.sessions.length,
    }
  }, [hist])

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        Evolução <TrendingUp className="size-6 text-lime-300" />
      </h1>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar exercício..."
          aria-label="Buscar exercício"
          className="min-h-[48px] flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 outline-none focus:border-lime-400"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          aria-label="Filtrar por grupo muscular"
          className="min-h-[48px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold outline-none focus:border-lime-400 sm:w-48"
        >
          <option value="Todas">Todos os grupos</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="progress-exercise" className="text-xs font-bold tracking-wide text-zinc-500">
          EXERCÍCIO
        </label>
        <select
          id="progress-exercise"
          value={activeId ?? ''}
          onChange={(e) => setSelected(e.target.value)}
          className="min-h-[52px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base font-semibold outline-none focus:border-lime-400"
        >
          {filtered.length === 0 && <option value="">Nenhum exercício encontrado</option>}
          {filtered.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} · {e.muscleGroup}
            </option>
          ))}
        </select>
      </div>

      {places.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="progress-place" className="text-xs font-bold tracking-wide text-zinc-500">
            LOCAL
          </label>
          <select
            id="progress-place"
            value={effectivePlace}
            onChange={(e) => setPlaceFilter(e.target.value)}
            className="min-h-[52px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base font-semibold outline-none focus:border-lime-400"
          >
            <option value="all">Todos os locais</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!activeEx ? (
        <p className="text-sm text-zinc-500">Registre um treino para ver gráficos aqui.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="font-extrabold">{activeEx.name}</p>
            <p className="text-xs text-zinc-500">
              {best ? `${best.sessions} sessões • recorde ${best.maxWeight} • maior volume ${Math.round(best.volume)}` : 'Sem dados ainda'}
            </p>
          </div>

          <div className="flex gap-2">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold ${metric === m.id ? 'bg-lime-400 text-black' : 'bg-zinc-900 text-zinc-400'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                Nenhuma série concluída para este exercício ainda.
              </p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="data" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} width={44} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 12 }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Line
                      type="monotone"
                      dataKey={metric}
                      stroke="#a3e635"
                      strokeWidth={3}
                      dot={{ fill: '#a3e635', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold">Histórico</p>
            {(hist?.sessions ?? []).slice().reverse().slice(0, 10).map((h) => (
              <div key={h.date} className="flex justify-between rounded-lg bg-zinc-900 px-3 py-2 text-sm">
                <span className="text-zinc-400">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                <span className="font-mono font-bold">
                  {h.maxWeight} × {h.maxReps} <span className="text-zinc-500">• vol {Math.round(h.volume)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

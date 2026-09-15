import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../lib/db'
import { historyForExercise } from '../lib/stats'

type Metric = 'maxWeight' | 'volume' | 'best1RM'

const METRICS: Array<{ id: Metric; label: string }> = [
  { id: 'maxWeight', label: 'Carga máx' },
  { id: 'volume', label: 'Volume' },
  { id: 'best1RM', label: '1RM est.' },
]

export default function Progress() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').toArray())
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('maxWeight')

  const filtered = useMemo(
    () => (exercises ?? []).filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30),
    [exercises, q],
  )

  const activeId = selected ?? filtered[0]?.id
  const activeEx = (exercises ?? []).find((e) => e.id === activeId)

  const hist = useMemo(
    () => (activeId && sessions ? historyForExercise(sessions, activeId) : null),
    [activeId, sessions],
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
      <h1 className="text-2xl font-extrabold">Evolução 📈</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar exercício..."
        className="min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 outline-none focus:border-lime-400"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e.id)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${activeId === e.id ? 'bg-lime-400 text-black' : 'bg-zinc-900 text-zinc-300'}`}
          >
            {e.name}
          </button>
        ))}
      </div>

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

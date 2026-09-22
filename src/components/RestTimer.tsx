import { Play, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { formatElapsed } from '../lib/stats'
import { useRestTimer } from '../lib/restTimer'

export default function RestTimer({ defaultSeconds = 90 }: { defaultSeconds?: number }) {
  const { remaining, totalSeconds, running, wakeLock, toggleWakeLock, setDuration, start, stop } = useRestTimer()

  useEffect(() => {
    setDuration(defaultSeconds)
  }, [defaultSeconds, setDuration])

  const seconds = remaining ?? totalSeconds
  const clock = formatElapsed(seconds * 1000)

  return (
    <div className="space-y-2 rounded-xl bg-zinc-900 p-2">
      <div className="flex items-center gap-2">
        <div className={`px-2 font-mono text-2xl font-bold tabular-nums ${running ? 'text-lime-300' : 'text-zinc-50'}`}>
          {clock}
        </div>
        <div className="flex flex-1 gap-1">
          {[60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => start(s)}
              className={`flex-1 rounded-lg px-1 py-2 text-xs font-semibold ${!running && totalSeconds === s ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
            >
              {s >= 60 ? `${s / 60}min` : `${s}s`}
            </button>
          ))}
        </div>
        {running ? (
          <button onClick={stop} className="rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white">
            Parar
          </button>
        ) : (
          <button
            onClick={() => start(totalSeconds)}
            aria-label="Iniciar descanso"
            className="inline-flex items-center rounded-lg bg-lime-400 px-3 py-2 text-sm font-bold text-black"
          >
            <Play className="size-4" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between px-1">
        <button
          onClick={toggleWakeLock}
          aria-pressed={wakeLock}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${wakeLock ? 'bg-lime-400/15 text-lime-300' : 'text-zinc-500'}`}
        >
          <Sun className="size-3.5" /> Tela ligada
        </button>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          {running ? 'Avisa no fim (som + notificação)' : 'Som, vibração e notificação no fim'}
        </span>
      </div>
    </div>
  )
}

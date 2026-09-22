import { Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatElapsed } from '../lib/stats'

/**
 * Cronômetro do treino aberto: conta a partir de `startedAt` e congela
 * em `finishedAt`. Como deriva do horário de início, sobrevive a reloads.
 */
export default function WorkoutTimer({ startedAt, finishedAt }: { startedAt: number; finishedAt?: number }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (finishedAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [finishedAt])

  const end = finishedAt ?? now
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums ${finishedAt ? 'text-zinc-400' : 'text-lime-300'}`}
      aria-label="Duração do treino"
    >
      <Timer className="size-4" /> {formatElapsed(end - startedAt)}
    </span>
  )
}

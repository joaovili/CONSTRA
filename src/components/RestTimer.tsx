import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function RestTimer({ defaultSeconds = 90 }: { defaultSeconds?: number }) {
  const [seconds, setSeconds] = useState(defaultSeconds)
  const [left, setLeft] = useState<number | null>(null)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    setSeconds(defaultSeconds)
  }, [defaultSeconds])

  useEffect(() => {
    return () => {
      if (ref.current) window.clearInterval(ref.current)
    }
  }, [])

  function start(s = seconds) {
    if (ref.current) window.clearInterval(ref.current)
    setLeft(s)
    ref.current = window.setInterval(() => {
      setLeft((v) => {
        if (v === null) return null
        if (v <= 1) {
          if (ref.current) window.clearInterval(ref.current)
          try {
            navigator.vibrate?.(200)
          } catch {}
          return 0
        }
        return v - 1
      })
    }, 1000)
  }

  function stop() {
    if (ref.current) window.clearInterval(ref.current)
    setLeft(null)
  }

  const mm = left !== null ? Math.floor(left / 60) : Math.floor(seconds / 60)
  const ss = left !== null ? left % 60 : seconds % 60

  return (
    <div className="flex items-center gap-2 rounded-xl bg-zinc-900 p-2">
      <div className="px-2 font-mono text-2xl font-bold tabular-nums">
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </div>
      <div className="flex flex-1 gap-1">
        {[60, 90, 120, 180].map((s) => (
          <button
            key={s}
            onClick={() => {
              setSeconds(s)
              start(s)
            }}
            className={`flex-1 rounded-lg px-1 py-2 text-xs font-semibold ${seconds === s && left === null ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
          >
            {s >= 60 ? `${s / 60}min` : `${s}s`}
          </button>
        ))}
      </div>
      {left !== null ? (
        <button onClick={stop} className="rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white">
          Parar
        </button>
      ) : (
        <button
          onClick={() => start()}
          aria-label="Iniciar descanso"
          className="inline-flex items-center rounded-lg bg-lime-400 px-3 py-2 text-sm font-bold text-black"
        >
          <Play className="size-4" />
        </button>
      )}
    </div>
  )
}

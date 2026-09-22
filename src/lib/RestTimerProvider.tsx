import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  acquireWakeLock,
  notifyRestDone,
  playBeep,
  releaseWakeLock,
  requestNotifyPermission,
  unlockAudio,
  vibrate,
} from './alerts'
import { loadRest, RestTimerContext, saveRest } from './restTimer'

/**
 * Timer de descanso global: persiste em localStorage como `endsAt`, então
 * sobrevive a navegação e reload. Ao zerar, dispara som + vibração +
 * notificação local. Só alerta a transição dentro da sessão (um descanso que
 * venceu com o app fechado é apenas limpo).
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endsAt, setEndsAt] = useState<number | null>(() => loadRest()?.endsAt ?? null)
  const [totalSeconds, setTotalSeconds] = useState(() => loadRest()?.totalSeconds ?? 90)
  const [remaining, setRemaining] = useState<number | null>(() => {
    const rest = loadRest()
    return rest ? Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000)) : null
  })
  const [wakeLock, setWakeLock] = useState(() => localStorage.getItem('logbook-rest-wakelock') === '1')
  const firedRef = useRef(false)

  const stop = useCallback(() => {
    firedRef.current = false
    setEndsAt(null)
    setRemaining(null)
    saveRest(null)
    releaseWakeLock()
  }, [])

  const start = useCallback((seconds: number) => {
    unlockAudio()
    requestNotifyPermission()
    const end = Date.now() + seconds * 1000
    firedRef.current = false
    setTotalSeconds(seconds)
    setEndsAt(end)
    setRemaining(seconds)
    saveRest({ endsAt: end, totalSeconds: seconds })
  }, [])

  const toggleWakeLock = useCallback(() => {
    setWakeLock((v) => {
      const next = !v
      localStorage.setItem('logbook-rest-wakelock', next ? '1' : '0')
      return next
    })
  }, [])

  const setDuration = useCallback((seconds: number) => {
    if (Number.isFinite(seconds) && seconds > 0) setTotalSeconds(seconds)
  }, [])

  // Conta o tempo e dispara o alerta ao zerar. Recalcula a partir de `endsAt`,
  // então continua correto mesmo se o timer for estrangulado em background.
  useEffect(() => {
    if (endsAt === null) return
    const target = endsAt
    function tick() {
      const left = Math.max(0, Math.ceil((target - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        playBeep()
        vibrate()
        void notifyRestDone()
        setEndsAt(null)
        saveRest(null)
        releaseWakeLock()
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [endsAt])

  // Wake Lock enquanto o descanso corre (se o usuário ligou a opção).
  useEffect(() => {
    if (endsAt !== null && wakeLock) void acquireWakeLock()
    else releaseWakeLock()
    return () => releaseWakeLock()
  }, [endsAt, wakeLock])

  // Re-adquire ao voltar para o app (o SO solta o lock ao sair da tela).
  useEffect(() => {
    if (!wakeLock) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && endsAt !== null) void acquireWakeLock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [wakeLock, endsAt])

  return (
    <RestTimerContext.Provider
      value={{
        endsAt,
        totalSeconds,
        remaining,
        running: endsAt !== null,
        wakeLock,
        toggleWakeLock,
        setDuration,
        start,
        stop,
      }}
    >
      {children}
    </RestTimerContext.Provider>
  )
}

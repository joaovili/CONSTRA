import { createContext, useContext } from 'react'

export interface RestTimerContextValue {
  /** Timestamp (ms) em que o descanso termina; null quando parado. */
  endsAt: number | null
  /** Duração escolhida (segundos), usada quando o timer está parado. */
  totalSeconds: number
  /** Segundos restantes; null quando parado. */
  remaining: number | null
  running: boolean
  /** Mantém a tela ligada durante o descanso (Wake Lock). */
  wakeLock: boolean
  toggleWakeLock: () => void
  /** Ajusta a duração padrão exibida quando parado (vem das Ajustes). */
  setDuration: (seconds: number) => void
  start: (seconds: number) => void
  stop: () => void
}

export const RestTimerContext = createContext<RestTimerContextValue | null>(null)

export function useRestTimer(): RestTimerContextValue {
  const ctx = useContext(RestTimerContext)
  if (!ctx) throw new Error('useRestTimer precisa do RestTimerProvider')
  return ctx
}

const STORAGE_KEY = 'logbook-rest-timer'

export interface PersistedRest {
  endsAt: number
  totalSeconds: number
}

/** Lê o descanso salvo. Se já venceu, limpa sem alertar. */
export function loadRest(): PersistedRest | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedRest
    if (!parsed || !Number.isFinite(parsed.endsAt) || parsed.endsAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveRest(value: PersistedRest | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

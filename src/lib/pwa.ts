import { createContext, useContext } from 'react'

export interface PwaContextValue {
  version: string
  buildTime: string
  needRefresh: boolean
  offlineReady: boolean
  updating: boolean
  update: () => Promise<void>
  checkForUpdate: () => Promise<boolean>
  reload: () => void
  dismissUpdate: () => void
  dismissOffline: () => void
}

export const PwaContext = createContext<PwaContextValue | null>(null)

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext)
  if (!ctx) throw new Error('usePwa precisa do PwaProvider')
  return ctx
}

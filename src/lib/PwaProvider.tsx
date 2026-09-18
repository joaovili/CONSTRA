import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PwaContext, type PwaContextValue } from './pwa'

export function PwaProvider({ children }: { children: ReactNode }) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const needRefreshRef = useRef(false)
  const [updating, setUpdating] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null
    },
  })

  useEffect(() => {
    needRefreshRef.current = needRefresh
  }, [needRefresh])

  const update = useCallback(async () => {
    setUpdating(true)
    try {
      await updateServiceWorker(true)
    } catch {
      setUpdating(false)
    }
  }, [updateServiceWorker])

  const checkForUpdate = useCallback(async () => {
    const reg = registrationRef.current ?? (await navigator.serviceWorker?.getRegistration())
    if (!reg) return false
    registrationRef.current = reg
    try {
      await reg.update()
    } catch {
      return false
    }
    await new Promise((r) => setTimeout(r, 1500))
    return needRefreshRef.current
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') registrationRef.current?.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const value: PwaContextValue = {
    version: __APP_VERSION__,
    buildTime: __BUILD_TIME__,
    needRefresh,
    offlineReady,
    updating,
    update,
    checkForUpdate,
    reload: () => window.location.reload(),
    dismissUpdate: () => setNeedRefresh(false),
    dismissOffline: () => setOfflineReady(false),
  }

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}

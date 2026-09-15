import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { isIOS, isStandalone } from '../lib/platform'

const TABS = [
  { to: '/', label: 'Treinos', icon: '🏋️', end: true },
  { to: '/biblioteca', label: 'Exercícios', icon: '📚' },
  { to: '/progresso', label: 'Evolução', icon: '📈' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    if (isIOS() && !isStandalone()) {
      const dismissed = localStorage.getItem('logbook-install-dismissed')
      if (!dismissed) setShowInstall(true)
    }
  }, [])

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-zinc-950 text-zinc-50">
      {showInstall && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-200">Instalar no iPhone 📲</p>
              <p className="mt-1 text-amber-100/80">
                Abra no <b>Safari</b> → <b>Compartilhar ⬆️</b> → <b>Adicionar à Tela de Início</b>. Assim funciona offline na academia.
              </p>
            </div>
            <button
              className="rounded-lg bg-zinc-800 px-2 py-1 text-xs"
              onClick={() => {
                localStorage.setItem('logbook-install-dismissed', '1')
                setShowInstall(false)
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-xs font-medium ${isActive ? 'text-lime-300' : 'text-zinc-500'}`
              }
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { BookOpen, CheckCircle2, Dumbbell, RefreshCw, Settings, Share, Smartphone, TrendingUp, type LucideIcon } from 'lucide-react'
import { isIOS, isStandalone } from '../lib/platform'
import { usePwa } from '../lib/pwa'

const TABS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/', label: 'Treinos', icon: Dumbbell, end: true },
  { to: '/biblioteca', label: 'Exercícios', icon: BookOpen },
  { to: '/progresso', label: 'Evolução', icon: TrendingUp },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [showInstall, setShowInstall] = useState(false)
  const { needRefresh, offlineReady, updating, update, dismissUpdate, dismissOffline } = usePwa()

  useEffect(() => {
    if (isIOS() && !isStandalone()) {
      const dismissed = localStorage.getItem('logbook-install-dismissed')
      if (!dismissed) setShowInstall(true)
    }
  }, [])

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-zinc-950 text-zinc-50">
      {needRefresh && (
        <div className="border-b border-lime-500/30 bg-lime-500/10 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-lime-200">
                <RefreshCw className="size-4" /> Nova versão disponível
              </p>
              <p className="mt-1 text-lime-100/80">Atualize para receber as últimas melhorias.</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={update}
                disabled={updating}
                className="rounded-lg bg-lime-400 px-2.5 py-1 text-xs font-extrabold text-black disabled:opacity-60"
              >
                {updating ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button onClick={dismissUpdate} className="rounded-lg bg-zinc-800 px-2 py-1 text-xs">
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {offlineReady && !needRefresh && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-lime-300" /> Pronto para usar offline.
          </span>
          <button onClick={dismissOffline} className="rounded bg-zinc-800 px-2 py-0.5">
            OK
          </button>
        </div>
      )}

      {showInstall && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-amber-200">
                <Smartphone className="size-4" /> Instalar no iPhone
              </p>
              <p className="mt-1 text-amber-100/80">
                Abra no <b>Safari</b> →{' '}
                <b className="inline-flex items-center gap-0.5">
                  Compartilhar <Share className="inline size-3.5" />
                </b>{' '}
                → <b>Adicionar à Tela de Início</b>. Assim funciona offline na academia.
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

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-4">{children}</main>

      <nav className="pb-safe z-10 shrink-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
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
              <t.icon className="size-5" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

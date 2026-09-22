import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, CheckCircle2, Dumbbell, RefreshCw, Settings, Share, Smartphone, Timer, TrendingUp, X, type LucideIcon } from 'lucide-react'
import { useInstall } from '../lib/install'
import { usePwa } from '../lib/pwa'
import { useRestTimer } from '../lib/restTimer'
import { formatElapsed } from '../lib/stats'

const TABS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/', label: 'Treinos', icon: Dumbbell, end: true },
  { to: '/cardio', label: 'Cardio', icon: Activity },
  { to: '/progresso', label: 'Evolução', icon: TrendingUp },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { ios, standalone, canPrompt, promptInstall } = useInstall()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('logbook-install-dismissed') === '1')
  const showInstall = !standalone && !dismissed && (ios || canPrompt)
  const { needRefresh, offlineReady, updating, update, dismissUpdate, dismissOffline } = usePwa()
  const { running: resting, remaining, stop: stopRest } = useRestTimer()

  function dismissInstall() {
    localStorage.setItem('logbook-install-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="app-height pt-safe relative mx-auto flex w-full max-w-md flex-col overflow-hidden bg-zinc-950 text-zinc-50">
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
                <Smartphone className="size-4" /> {ios ? 'Instalar no iPhone' : 'Instalar o app'}
              </p>
              <p className="mt-1 text-amber-100/80">
                {ios ? (
                  <>
                    Abra no <b>Safari</b> →{' '}
                    <b className="inline-flex items-center gap-0.5">
                      Compartilhar <Share className="inline size-3.5" />
                    </b>{' '}
                    → <b>Adicionar à Tela de Início</b>. Assim funciona offline na academia.
                  </>
                ) : (
                  <>Adicione o CONSTRA à tela inicial para usar offline na academia.</>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {canPrompt && (
                <button
                  onClick={() => void promptInstall()}
                  className="rounded-lg bg-lime-400 px-2.5 py-1 text-xs font-extrabold text-black"
                >
                  Instalar
                </button>
              )}
              <button className="rounded-lg bg-zinc-800 px-2 py-1 text-xs" onClick={dismissInstall}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28">{children}</main>

      {resting && remaining !== null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <button
            onClick={stopRest}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-lime-500/40 bg-zinc-900/90 py-2 pr-2 pl-4 text-sm font-bold shadow-lg backdrop-blur-md"
          >
            <Timer className="size-4 text-lime-300" />
            <span className="font-mono tabular-nums text-lime-300">{formatElapsed(remaining * 1000)}</span>
            <span className="text-zinc-400">descanso</span>
            <X className="size-4 text-zinc-500" />
          </button>
        </div>
      )}

      <nav className="pb-safe absolute inset-x-0 bottom-0 z-10 px-3">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-full border border-zinc-800 bg-zinc-900/60 p-1 shadow-lg backdrop-blur-md">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-semibold ${isActive ? 'bg-zinc-700/60 text-lime-300' : 'text-zinc-400'}`
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

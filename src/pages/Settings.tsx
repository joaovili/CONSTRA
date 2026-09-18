import { useLiveQuery } from 'dexie-react-hooks'
import { Check, CheckCircle2, Download, Share, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { db, ensureSettings } from '../lib/db'
import { downloadFile, exportJSON, importJSON, sessionsToCSV } from '../lib/backup'
import { isIOS, isStandalone } from '../lib/platform'
import { usePwa } from '../lib/pwa'

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get('app'))
  const counts = useLiveQuery(async () => ({
    ex: await db.exercises.count(),
    rt: await db.routines.count(),
    ws: await db.sessions.count(),
  }))
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [checking, setChecking] = useState(false)
  const [updateMsg, setUpdateMsg] = useState('')
  const { version, buildTime, needRefresh, updating, update, checkForUpdate, reload } = usePwa()

  useEffect(() => {
    ensureSettings()
  }, [])

  async function onCheckUpdate() {
    setChecking(true)
    setUpdateMsg('')
    const found = await checkForUpdate()
    setChecking(false)
    setUpdateMsg(found ? 'Nova versão encontrada! Toque em "Atualizar agora".' : 'Você já está na versão mais recente.')
  }

  async function doExport() {
    const json = await exportJSON()
    downloadFile(`constra-backup-${new Date().toISOString().slice(0, 10)}.json`, json)
    setMsg('Backup exportado! Guarde o arquivo (importante no iOS).')
  }

  async function doCSV() {
    const csv = sessionsToCSV(sessions ?? [])
    downloadFile('constra-series.csv', csv, 'text/csv')
    setMsg('CSV exportado!')
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const text = await f.text()
      const r = await importJSON(text)
      setMsg(`Importado: ${r.exercises} exercícios, ${r.routines} rotinas, ${r.sessions} sessões.`)
    } catch {
      setMsg('Arquivo inválido.')
    } finally {
      e.target.value = ''
    }
  }

  async function wipe() {
    await db.transaction('rw', [db.exercises, db.routines, db.sessions], async () => {
      await db.exercises.clear()
      await db.routines.clear()
      await db.sessions.clear()
    })
    setConfirmWipe(false)
    setMsg('Tudo apagado.')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Ajustes</h1>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
        <p>
          {counts?.ex ?? 0} exercícios • {counts?.rt ?? 0} rotinas • {counts?.ws ?? 0} sessões
        </p>
        <p className="mt-1">Dados 100% locais, no seu aparelho. Sem conta, sem nuvem.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <p className="mb-2 font-bold">Unidade de peso</p>
        <div className="grid grid-cols-2 gap-2">
          {(['kg', 'lbs'] as const).map((u) => (
            <button
              key={u}
              onClick={() => settings && db.settings.put({ ...settings, unit: u })}
              className={`rounded-xl py-3 font-extrabold ${settings?.unit === u ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
            >
              {u}
            </button>
          ))}
        </div>
        <p className="mt-3 mb-2 font-bold">Descanso padrão</p>
        <div className="grid grid-cols-4 gap-2">
          {[60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => settings && db.settings.put({ ...settings, restSeconds: s })}
              className={`rounded-xl py-2 text-sm font-bold ${settings?.restSeconds === s ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
            >
              {s >= 60 ? `${s / 60}min` : `${s}s`}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="font-bold text-amber-200">Backup (importante no iOS)</p>
        <p className="mb-3 text-sm text-zinc-400">
          O iPhone pode apagar dados do site se faltar espaço. Exporte o backup de tempos em tempos.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={doExport}
            className="flex items-center justify-center gap-1 rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-black"
          >
            <Download className="size-4" /> Exportar JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-1 rounded-xl bg-zinc-800 py-3 text-sm font-bold"
          >
            <Upload className="size-4" /> Importar JSON
          </button>
        </div>
        <button onClick={doCSV} className="mt-2 w-full rounded-xl bg-zinc-800 py-3 text-sm font-bold">
          Exportar CSV (planilha)
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        {msg && <p className="mt-2 text-sm text-lime-300">{msg}</p>}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
        <p className="mb-1 font-bold">Instalar no iPhone</p>
        {isStandalone() ? (
          <p className="flex items-center gap-1.5 text-lime-300">
            <CheckCircle2 className="size-4 shrink-0" /> Rodando como app instalado. Tudo certo!
          </p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-zinc-400">
            <li>
              Abra esta página no <b>Safari</b>{' '}
              {isIOS() ? (
                <span className="inline-flex items-center gap-0.5">
                  (você já está nele <Check className="inline size-3.5" />)
                </span>
              ) : (
                '(no iPhone use o Safari)'
              )}
            </li>
            <li>
              Toque em{' '}
              <b className="inline-flex items-center gap-0.5">
                Compartilhar <Share className="inline size-3.5" />
              </b>
            </li>
            <li><b>Adicionar à Tela de Início</b> → Adicionar</li>
            <li>Abra pelo ícone CONSTRA na home (fullscreen + offline)</li>
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <p className="mb-1 font-bold">Versão do app</p>
        <p className="text-sm text-zinc-400">
          CONSTRA v{version} <span className="text-zinc-600">• build {new Date(buildTime).toLocaleString('pt-BR')}</span>
        </p>
        {needRefresh && (
          <button
            onClick={update}
            disabled={updating}
            className="mt-3 w-full rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-black disabled:opacity-60"
          >
            {updating ? 'Atualizando...' : 'Atualizar agora'}
          </button>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={onCheckUpdate}
            disabled={checking}
            className="rounded-xl bg-zinc-800 py-3 text-sm font-bold text-zinc-200 disabled:opacity-60"
          >
            {checking ? 'Verificando...' : 'Verificar versão'}
          </button>
          <button onClick={reload} className="rounded-xl bg-zinc-800 py-3 text-sm font-bold text-zinc-200">
            Recarregar app
          </button>
        </div>
        {updateMsg && <p className="mt-2 text-sm text-lime-300">{updateMsg}</p>}
      </div>

      <button onClick={() => setConfirmWipe(true)} className="w-full rounded-xl border border-red-900 py-3 text-sm font-bold text-red-400">
        Apagar todos os dados
      </button>

      <ConfirmDialog
        open={confirmWipe}
        title="Apagar TUDO?"
        description={
          <>
            {counts?.ex ?? 0} exercícios • {counts?.rt ?? 0} rotinas • {counts?.ws ?? 0} sessões serão apagados.
            <br />
            Exporte o backup antes!
            <br />
            <span className="text-red-300">Não dá pra desfazer.</span>
          </>
        }
        confirmLabel="Apagar tudo mesmo assim"
        onConfirm={wipe}
        onClose={() => setConfirmWipe(false)}
      />
    </div>
  )
}

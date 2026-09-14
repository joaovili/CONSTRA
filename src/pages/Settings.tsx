import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { db, getSettings } from '../lib/db'
import { downloadFile, exportJSON, importJSON, sessionsToCSV } from '../lib/backup'
import { isIOS, isStandalone } from '../components/Layout'

export default function Settings() {
  const settings = useLiveQuery(() => getSettings())
  const counts = useLiveQuery(async () => ({
    ex: await db.exercises.count(),
    rt: await db.routines.count(),
    ws: await db.sessions.count(),
  }))
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  async function doExport() {
    const json = await exportJSON()
    downloadFile(`logbook-backup-${new Date().toISOString().slice(0, 10)}.json`, json)
    setMsg('Backup exportado! Guarde o arquivo (importante no iOS).')
  }

  async function doCSV() {
    const csv = sessionsToCSV(sessions ?? [])
    downloadFile('logbook-series.csv', csv, 'text/csv')
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
    if (!confirm('Apagar TUDO (exercícios, rotinas, sessões)? Exporte backup antes!')) return
    if (!confirm('Tem certeza absoluta?')) return
    await db.transaction('rw', [db.exercises, db.routines, db.sessions], async () => {
      await db.exercises.clear()
      await db.routines.clear()
      await db.sessions.clear()
    })
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
          <button onClick={doExport} className="rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-black">
            ⬇ Exportar JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-zinc-800 py-3 text-sm font-bold">
            ⬆ Importar JSON
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
          <p className="text-lime-300">✅ Rodando como app instalado. Tudo certo!</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-zinc-400">
            <li>Abra esta página no <b>Safari</b> {isIOS() ? '(você já está nele ✅)' : '(no iPhone use o Safari)'}</li>
            <li>Toque em <b>Compartilhar ⬆️</b></li>
            <li><b>Adicionar à Tela de Início</b> → Adicionar</li>
            <li>Abra pelo ícone Logbook na home (fullscreen + offline)</li>
          </ol>
        )}
      </div>

      <button onClick={wipe} className="w-full rounded-xl border border-red-900 py-3 text-sm font-bold text-red-400">
        Apagar todos os dados
      </button>
    </div>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { Check, CheckCircle2, Download, MapPin, Plus, Share, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { db, ensureSettings } from '../lib/db'
import { downloadFile, exportRoutinesCSV, importRoutinesCSV } from '../lib/backup'
import { useInstall } from '../lib/install'
import { createPlace, deletePlace, setCurrentPlace, sortPlaces } from '../lib/places'
import { usePwa } from '../lib/pwa'
import type { Place } from '../lib/types'

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get('app'))
  const placesRaw = useLiveQuery(() => db.places.toArray(), [], [])
  const places = useMemo(() => sortPlaces(placesRaw), [placesRaw])
  const currentPlaceId = settings?.currentPlaceId
  const [newPlace, setNewPlace] = useState('')
  const counts = useLiveQuery(async () => ({
    ex: await db.exercises.count(),
    rt: await db.routines.count(),
    ws: await db.sessions.count(),
    cd: await db.cardio.count(),
  }))
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [checking, setChecking] = useState(false)
  const [updateMsg, setUpdateMsg] = useState('')
  const { version, buildTime, needRefresh, updating, update, checkForUpdate, reload } = usePwa()
  const { ios, standalone, canPrompt, promptInstall } = useInstall()

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
    const csv = await exportRoutinesCSV()
    downloadFile(`constra-fichas-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    setMsg('Fichas exportadas! Guarde o arquivo (importante no iOS).')
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const r = await importRoutinesCSV(await f.text())
      setMsg(`Importado: ${r.routines} fichas e ${r.exercises} exercícios novos.`)
    } catch {
      setMsg('Arquivo inválido.')
    } finally {
      e.target.value = ''
    }
  }

  async function addPlace() {
    const name = newPlace.trim()
    if (!name) return
    const place = await createPlace(name)
    setNewPlace('')
    if (!settings?.currentPlaceId) await setCurrentPlace(place.id)
  }

  async function wipe() {
    await db.transaction('rw', [db.exercises, db.routines, db.sessions, db.cardio, db.places, db.meta], async () => {
      await db.exercises.clear()
      await db.routines.clear()
      await db.sessions.clear()
      await db.cardio.clear()
      await db.places.clear()
      await db.meta.clear()
    })
    setConfirmWipe(false)
    setMsg('Tudo apagado.')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Ajustes</h1>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
        <p>
          {counts?.ex ?? 0} exercícios • {counts?.rt ?? 0} rotinas • {counts?.ws ?? 0} sessões • {counts?.cd ?? 0}{' '}
          atividades
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

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-bold">Locais</p>
          <span className="text-xs text-zinc-500">{places.length}</span>
        </div>
        <p className="mb-3 text-sm text-zinc-400">
          A mesma carga não é comparável entre academias. Recorde e sugestão de carga são por local.
        </p>
        <div className="space-y-2">
          {places.map((p) => (
            <PlaceRow key={p.id} place={p} isCurrent={p.id === currentPlaceId} />
          ))}
          {places.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-800 p-3 text-center text-sm text-zinc-500">
              Nenhum local ainda.
            </p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={newPlace}
            onChange={(e) => setNewPlace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addPlace()
            }}
            placeholder="Nova academia / local"
            className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-zinc-950 px-3 text-sm outline-none"
          />
          <button
            onClick={() => void addPlace()}
            disabled={!newPlace.trim()}
            className="inline-flex items-center gap-1 rounded-xl bg-lime-400 px-3 text-sm font-extrabold text-black disabled:opacity-50"
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="font-bold text-amber-200">Fichas de treino (importante no iOS)</p>
        <p className="mb-3 text-sm text-zinc-400">
          Exporte suas fichas em CSV para guardar ou levar a outro aparelho. O iPhone pode apagar dados do site se faltar
          espaço, então exporte de tempos em tempos.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={doExport}
            className="flex items-center justify-center gap-1 rounded-xl bg-lime-400 py-3 text-sm font-extrabold text-black"
          >
            <Download className="size-4" /> Exportar CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-1 rounded-xl bg-zinc-800 py-3 text-sm font-bold"
          >
            <Upload className="size-4" /> Importar CSV
          </button>
        </div>
        <input ref={fileRef} type="file" accept="text/csv,.csv" className="hidden" onChange={onFile} />
        {msg && <p className="mt-2 text-sm text-lime-300">{msg}</p>}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
        <p className="mb-1 font-bold">{ios ? 'Instalar no iPhone' : 'Instalar o app'}</p>
        {standalone ? (
          <p className="flex items-center gap-1.5 text-lime-300">
            <CheckCircle2 className="size-4 shrink-0" /> Rodando como app instalado. Tudo certo!
          </p>
        ) : canPrompt ? (
          <>
            <p className="text-zinc-400">Instale para abrir em tela cheia e funcionar offline na academia.</p>
            <button
              onClick={() => void promptInstall()}
              className="mt-2 w-full rounded-xl bg-lime-400 py-2 text-sm font-extrabold text-black"
            >
              Instalar agora
            </button>
          </>
        ) : ios ? (
          <ol className="list-decimal space-y-1 pl-5 text-zinc-400">
            <li>
              Abra esta página no <b>Safari</b>{' '}
              <span className="inline-flex items-center gap-0.5">
                (você já está nele <Check className="inline size-3.5" />)
              </span>
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
        ) : (
          <p className="text-zinc-400">
            No menu do navegador, escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>. Assim abre em
            tela cheia e funciona offline.
          </p>
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
            {counts?.ex ?? 0} exercícios • {counts?.rt ?? 0} rotinas • {counts?.ws ?? 0} sessões • {counts?.cd ?? 0}{' '}
            atividades serão apagados.
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

function PlaceRow({ place, isCurrent }: { place: Place; isCurrent: boolean }) {
  const [name, setName] = useState(place.name)
  const [confirmDel, setConfirmDel] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === place.name) {
      setName(place.name)
      return
    }
    await db.places.update(place.id, { name: trimmed })
    setName(trimmed)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-zinc-950 p-2">
      <button
        onClick={() => void setCurrentPlace(place.id)}
        aria-pressed={isCurrent}
        title="Definir como local atual"
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold ${isCurrent ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
      >
        <MapPin className="size-3.5" /> {isCurrent ? 'Atual' : 'Usar'}
      </button>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        aria-label="Nome do local"
        className="min-h-[40px] min-w-0 flex-1 rounded-lg bg-zinc-900 px-2 text-sm font-semibold outline-none focus:ring-1 focus:ring-lime-400"
      />
      <button
        onClick={() => setConfirmDel(true)}
        aria-label="Excluir local"
        className="inline-flex shrink-0 items-center rounded-lg bg-zinc-800 px-3 py-2"
      >
        <Trash2 className="size-4" />
      </button>

      <ConfirmDialog
        open={confirmDel}
        title="Excluir local?"
        description={
          <>
            <span className="font-bold text-zinc-200">{place.name}</span>
            <br />
            Treinos deste local ficam sem local (não somem).
            <br />
            <span className="text-red-300">Não dá pra desfazer.</span>
          </>
        }
        confirmLabel="Excluir local"
        onConfirm={async () => {
          await deletePlace(place.id)
          setConfirmDel(false)
        }}
        onClose={() => setConfirmDel(false)}
      />
    </div>
  )
}

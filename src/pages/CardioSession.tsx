import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Gauge, Info, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import { db } from '../lib/db'
import { formatDuration, formatPace, paceMinPerKm, trainingLoad } from '../lib/stats'
import {
  ACTIVITY_KINDS,
  EFFORT_SCALE,
  FEEL_SCALE,
  TRAINING_TYPES,
  uid,
  type ActivityKind,
  type CardioSession,
} from '../lib/types'

export default function CardioSessionPage() {
  const { id } = useParams()
  const isNew = !id || id === 'nova'
  const session = useLiveQuery(() => (!isNew && id ? db.cardio.get(id) : undefined), [id, isNew])

  if (isNew) return <CardioForm />
  if (!session) return <p className="text-zinc-400">Carregando atividade...</p>
  return <CardioForm key={session.id} session={session} />
}

/** Mesma tela para registrar (sem `session`) e editar (com `session`). */
function CardioForm({ session }: { session?: CardioSession }) {
  const navigate = useNavigate()
  const isNew = !session

  const [kind, setKind] = useState<ActivityKind>(session?.kind ?? 'Corrida')
  const [trainingType, setTrainingType] = useState(session?.trainingType ?? 'Livre')
  const [startedAt, setStartedAt] = useState(toLocalInput(session?.startedAt ?? Date.now()))
  const [duration, setDuration] = useState(session?.durationMin ? String(session.durationMin) : '')
  const [distance, setDistance] = useState(session?.distanceKm ? String(session.distanceKm) : '')
  const [calories, setCalories] = useState(session?.calories ? String(session.calories) : '')
  const [effort, setEffort] = useState<number | undefined>(session?.effort)
  const [feelAfter, setFeelAfter] = useState<number | undefined>(session?.feelAfter)
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const durationMin = parseNum(duration)
  const distanceKm = parseNum(distance)
  const pace = paceMinPerKm(durationMin, distanceKm)
  const paceText = formatPace(pace)
  const load = trainingLoad(durationMin, effort)
  const missingData = !durationMin || !distanceKm

  function changeKind(next: ActivityKind) {
    setKind(next)
    if (!TRAINING_TYPES[next].includes(trainingType)) setTrainingType('Livre')
  }

  async function save() {
    const now = Date.now()
    const payload = {
      kind,
      trainingType,
      startedAt: fromLocalInput(startedAt),
      durationMin: parseNum(duration),
      distanceKm: parseNum(distance),
      calories: parseNum(calories),
      effort,
      feelAfter,
      notes: notes.trim() || undefined,
    }
    if (session) {
      await db.cardio.update(session.id, payload)
      navigate('/cardio', { state: { flash: 'Atividade atualizada' } })
    } else {
      await db.cardio.add({ id: uid('cd_'), createdAt: now, ...payload })
      navigate('/cardio', { state: { flash: 'Atividade registrada' } })
    }
  }

  async function remove() {
    if (!session) return
    await db.cardio.delete(session.id)
    navigate('/cardio', { state: { flash: 'Atividade excluída' } })
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/cardio')} className="inline-flex items-center gap-1 text-sm text-zinc-400">
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-extrabold">{isNew ? 'Registrar atividade' : 'Editar atividade'}</h1>

      <div>
        <p className="mb-2 text-xs font-bold tracking-wide text-zinc-500">ATIVIDADE</p>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_KINDS.map((k) => (
            <button
              key={k}
              onClick={() => changeKind(k)}
              className={`rounded-xl py-3 font-extrabold ${kind === k ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold tracking-wide text-zinc-500">TIPO DE TREINO</p>
        <div className="flex flex-wrap gap-2">
          {TRAINING_TYPES[kind].map((t) => (
            <button
              key={t}
              onClick={() => setTrainingType(t)}
              aria-pressed={trainingType === t}
              className={`rounded-full border px-3 py-2 text-sm font-bold ${trainingType === t ? 'border-lime-400 bg-lime-400/15 text-lime-200' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="cardio-date" className="text-xs font-bold tracking-wide text-zinc-500">
          QUANDO
        </label>
        <input
          id="cardio-date"
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className="mt-1 min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 outline-none focus:border-lime-400"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tempo (min)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="ex: 32"
              className="h-[52px] w-full rounded-xl bg-zinc-950 px-3 text-center text-lg font-bold outline-none"
            />
          </Field>
          <Field label="Distância (km)">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="ex: 5.2"
              className="h-[52px] w-full rounded-xl bg-zinc-950 px-3 text-center text-lg font-bold outline-none"
            />
          </Field>
        </div>
        <Field label="Calorias (kcal)">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="ex: 420"
            className="h-[52px] w-full rounded-xl bg-zinc-950 px-3 text-center text-lg font-bold outline-none"
          />
        </Field>

        <div className="flex items-center justify-between rounded-xl bg-zinc-950 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <Gauge className="size-4 text-lime-300" /> Ritmo
          </span>
          <span className="font-mono font-bold">{paceText ?? '—'}</span>
        </div>
        {load != null && (
          <div className="flex items-center justify-between rounded-xl bg-zinc-950 px-3 py-2 text-sm">
            <span className="text-zinc-400">Carga (esforço × tempo)</span>
            <span className="font-mono font-bold">{load}</span>
          </div>
        )}
      </div>

      {missingData && (
        <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
          <Info className="mt-0.5 size-4 shrink-0" />
          Nada é obrigatório, mas sem tempo e distância fica difícil comparar sua evolução depois. Preencha o que
          conseguir.
        </p>
      )}

      <div>
        <p className="mb-1 text-xs font-bold tracking-wide text-zinc-500">COMO FOI O ESFORÇO NO TREINO?</p>
        <p className="mb-2 text-xs text-zinc-500">Escolha a opção que mais parece com o treino de hoje.</p>
        <ScaleRow scale={EFFORT_SCALE} value={effort} onChange={setEffort} />
      </div>

      <div>
        <p className="mb-1 text-xs font-bold tracking-wide text-zinc-500">COMO VOCÊ SE SENTE AGORA?</p>
        <p className="mb-2 text-xs text-zinc-500">Depois do treino, como está seu corpo?</p>
        <ScaleRow scale={FEEL_SCALE} value={feelAfter} onChange={setFeelAfter} />
      </div>

      <div>
        <label htmlFor="cardio-notes" className="text-xs font-bold tracking-wide text-zinc-500">
          OBSERVAÇÕES (OPCIONAL)
        </label>
        <textarea
          id="cardio-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="ex: perna pesada no final, terreno com subida..."
          className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 outline-none focus:border-lime-400"
        />
      </div>

      <div className="sticky-above-nav -mx-4 mt-2 px-4 py-3">
        <button onClick={save} className="w-full rounded-xl bg-lime-400 py-3 font-extrabold text-black">
          {isNew ? 'Salvar atividade' : 'Salvar alterações'}
        </button>
      </div>

      {session && (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-red-900 py-3 text-sm font-bold text-red-400"
        >
          <Trash2 className="size-4" /> Excluir atividade
        </button>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir atividade?"
        description={
          session ? (
            <>
              <span className="font-bold text-zinc-200">
                {session.kind} · {session.trainingType}
              </span>
              <br />
              {new Date(session.startedAt).toLocaleString('pt-BR')}
              <br />
              <span className="text-red-300">Não dá pra desfazer.</span>
            </>
          ) : undefined
        }
        confirmLabel="Excluir atividade"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />

      {durationMin && distanceKm && (
        <p className="pb-2 text-center text-xs text-zinc-600">
          {formatDuration(durationMin)} • {distanceKm} km {paceText ? `• ${paceText}` : ''}
        </p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

function ScaleRow({
  scale,
  value,
  onChange,
}: {
  scale: Array<{ value: number; label: string }>
  value?: number
  onChange: (value: number | undefined) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {scale.map((s) => {
        const active = value === s.value
        return (
          <button
            key={s.value}
            onClick={() => onChange(active ? undefined : s.value)}
            aria-pressed={active}
            className={`flex shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left ${active ? 'border-lime-400 bg-lime-400/15 text-lime-200' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}`}
          >
            <span className="text-xs font-bold opacity-60">{s.value}</span>
            <span className="whitespace-nowrap text-sm font-bold">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function parseNum(value: string): number | undefined {
  const n = Number(value.replace(',', '.'))
  return value.trim() !== '' && Number.isFinite(n) ? n : undefined
}

function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(value: string): number {
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : Date.now()
}

import { X } from 'lucide-react'
import { useState } from 'react'
import type { Exercise } from '../lib/types'

interface Props {
  exercise: Exercise | null
  onClose: () => void
}

/** Folha inferior com o GIF de execução e o passo a passo. */
export default function ExerciseInfo({ exercise, onClose }: Props) {
  const [failed, setFailed] = useState(false)
  if (!exercise) return null

  const steps = (exercise.instructions ?? []).map((s) => s.replace(/^step\s*:?\s*\d+\s*/i, '').trim()).filter(Boolean)
  const showGif = exercise.gifUrl && !failed

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={exercise.name}>
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 cursor-default bg-black/70" />
      <div className="pb-safe relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-4 pb-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold leading-tight capitalize">{exercise.name}</h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              {exercise.muscleGroup} • {exercise.equipment}
              {exercise.unilateral ? ' • unilateral' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg bg-zinc-800 p-2 text-zinc-300"
          >
            <X className="size-4" />
          </button>
        </div>

        {showGif ? (
          <img
            src={exercise.gifUrl}
            alt={`Execução de ${exercise.name}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="mt-3 w-full rounded-2xl bg-zinc-950 object-contain"
          />
        ) : (
          <div className="mt-3 flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
            Sem GIF para este exercício.
          </div>
        )}

        {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
          <div className="mt-3 text-xs text-zinc-400">
            <span className="font-bold text-zinc-300">Alvo:</span> {exercise.targetMuscles.join(', ')}
            {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
              <>
                {' '}
                • <span className="font-bold text-zinc-300">Auxilia:</span> {exercise.secondaryMuscles.join(', ')}
              </>
            )}
          </div>
        )}

        {steps.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold tracking-wide text-zinc-500">COMO EXECUTAR</p>
            <ol className="mt-2 space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-300">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-lime-300">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {exercise.source === 'ascend' && (
          <p className="mt-4 text-center text-[11px] text-zinc-600">Dados e mídia por AscendAPI (ExerciseDB)</p>
        )}
      </div>
    </div>
  )
}

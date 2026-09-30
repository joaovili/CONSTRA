import { Check, Download, Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import { searchAscend } from '../lib/ascend'
import { importAscendExercise } from '../lib/ascendImport'
import type { Exercise } from '../lib/types'

type Result = { exerciseId: string; name: string; gifUrl: string }

interface Props {
  /** Termo digitado pelo usuário (mesmo campo da busca local). */
  query: string
  /** Ids da Ascend já presentes na biblioteca local. */
  imported?: Set<string>
  /** Exercício importado (ou já existente) escolhido pelo usuário. */
  onPick: (exercise: Exercise) => void
}

/**
 * Busca no catálogo da AscendAPI sob demanda. Nada é baixado até o usuário
 * procurar e escolher — nesse momento salvamos só o exercício escolhido.
 */
export default function AscendSearch({ query, imported, onPick }: Props) {
  const q = query.trim()
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resultsFor, setResultsFor] = useState<{ q: string; list: Result[] } | null>(null)
  const [errorFor, setErrorFor] = useState<{ q: string; msg: string } | null>(null)

  // Resultados ficam amarrados ao termo buscado: mudar o texto esconde a lista.
  const results = resultsFor?.q === q ? resultsFor.list : null
  const error = errorFor?.q === q ? errorFor.msg : ''

  async function run() {
    if (!q || loading) return
    setLoading(true)
    setErrorFor(null)
    try {
      setResultsFor({ q, list: await searchAscend(q) })
    } catch {
      setErrorFor({ q, msg: 'Não foi possível buscar online. Confira a conexão.' })
    } finally {
      setLoading(false)
    }
  }

  async function pick(id: string) {
    setBusyId(id)
    setErrorFor(null)
    try {
      onPick(await importAscendExercise(id))
    } catch {
      setErrorFor({ q, msg: 'Não foi possível baixar este exercício.' })
    } finally {
      setBusyId(null)
    }
  }

  if (!q) return null

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs font-bold tracking-wide text-zinc-500">BIBLIOTECA ONLINE · ASCENDAPI</p>

      {results === null ? (
        <>
          <p className="mt-1 mb-2 text-sm text-zinc-400">
            Busca no catálogo da AscendAPI. Só baixamos o exercício que você escolher.
          </p>
          <button
            onClick={() => void run()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-bold text-zinc-100 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? 'Buscando…' : `Buscar "${q}"`}
          </button>
        </>
      ) : results.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">Nada na AscendAPI para “{q}”.</p>
      ) : (
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {results.map((r) => {
            const already = imported?.has(r.exerciseId) ?? false
            return (
              <button
                key={r.exerciseId}
                onClick={() => void pick(r.exerciseId)}
                disabled={busyId !== null}
                className="flex w-full items-center gap-3 rounded-lg bg-zinc-950 p-2 text-left text-sm disabled:opacity-60"
              >
                <img src={r.gifUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded bg-zinc-900 object-cover" />
                <span className="min-w-0 flex-1 truncate capitalize">{r.name}</span>
                {busyId === r.exerciseId ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-lime-300" />
                ) : already ? (
                  <Check className="size-4 shrink-0 text-lime-300" />
                ) : (
                  <Download className="size-4 shrink-0 text-zinc-400" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-amber-300">{error}</p>}
      {results !== null && (
        <button onClick={() => void run()} disabled={loading} className="mt-2 text-xs text-zinc-500 underline disabled:opacity-60">
          Buscar de novo
        </button>
      )}
    </div>
  )
}

import { TriangleAlert } from 'lucide-react'
import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[CONSTRA] crash:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md space-y-3 p-6 text-sm">
          <TriangleAlert className="size-8 text-red-400" />
          <p className="font-bold text-red-300">Algo quebrou nesta tela.</p>
          <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-3 font-mono text-xs text-zinc-300">
            {String(this.state.error.message || this.state.error)}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null })
              window.location.href = '/'
            }}
            className="w-full rounded-xl bg-lime-400 py-3 font-extrabold text-black"
          >
            Voltar ao início
          </button>
          <p className="text-zinc-500">Se persistir, me manda print dessa mensagem.</p>
        </div>
      )
    }
    return this.props.children
  }
}

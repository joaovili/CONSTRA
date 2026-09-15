import type { ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="alertdialog" aria-modal="true">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70"
      />
      <div className="pb-safe relative w-full max-w-md rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-5 pb-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
        <p className="text-center text-4xl">🗑</p>
        <h3 className="mt-2 text-center text-lg font-extrabold">{title}</h3>
        {description && (
          <div className="mt-2 rounded-xl bg-zinc-950 p-3 text-center text-sm text-zinc-400">{description}</div>
        )}
        <div className="mt-4 space-y-2">
          <button
            onClick={onConfirm}
            autoFocus
            className="min-h-[52px] w-full rounded-2xl bg-red-500 font-extrabold text-white active:scale-[0.99]"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="min-h-[52px] w-full rounded-2xl bg-zinc-800 font-bold text-zinc-200"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Date (ms) → valor de <input type="datetime-local"> no fuso local. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): number {
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : Date.now()
}

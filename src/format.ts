export function formatElapsed(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}分`
  return `${h}時間${m}分`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** epoch ms → <input type="datetime-local"> の値 (端末のローカル時刻) */
export function toLocalInput(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> の値 → epoch ms。不正な値は null */
export function fromLocalInput(value: string): number | null {
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

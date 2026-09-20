import { useEffect, useState } from 'react'
import { formatDateTime, formatElapsed } from '../format.ts'
import type { AppRecord } from '../types.ts'

export function MedStatus({ records }: { records: AppRecord[] }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const last = records.find((r) => r.type === 'medication')

  return (
    <section className="card">
      <h2>最後に薬を飲んでから</h2>
      {last && last.type === 'medication' ? (
        <>
          <p className="big">{formatElapsed(now - last.ts)}</p>
          <p className="muted">
            {formatDateTime(last.ts)}　{last.name}
          </p>
        </>
      ) : (
        <p className="muted">服薬の記録はまだありません。</p>
      )}
    </section>
  )
}

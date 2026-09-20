import { useEffect, useState } from 'react'
import { formatDateTime, formatElapsed } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { localizeMedicineName } from '../medicineNames.ts'
import type { AppRecord } from '../types.ts'

export function MedStatus({ records }: { records: AppRecord[] }) {
  const { t, lang } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const last = records.find((r) => r.type === 'medication')

  return (
    <section className="card">
      <h2>{t('last.title')}</h2>
      {last && last.type === 'medication' ? (
        <>
          <p className="big">{formatElapsed(now - last.ts, t)}</p>
          <p className="muted">
            {formatDateTime(last.ts, lang)}　{localizeMedicineName(last.name, lang)}
          </p>
        </>
      ) : (
        <p className="muted">{t('last.none')}</p>
      )}
    </section>
  )
}

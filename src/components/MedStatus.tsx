import { useEffect, useState } from 'react'
import { formatDateTime, formatElapsed } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { localizeMedicineName } from '../medicineNames.ts'
import type { AppRecord } from '../types.ts'

/** 最後に薬を飲んでからの経過時間。気圧カードの左下に置く */
export function MedStatus({ records }: { records: AppRecord[] }) {
  const { t, lang } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const last = records.find((r) => r.type === 'medication')

  return (
    <div className="med-status">
      <h3 className="med-status-title">{t('last.title')}</h3>
      {last && last.type === 'medication' ? (
        <>
          <p className="med-status-time">{formatElapsed(now - last.ts, t)}</p>
          <p className="muted">
            {formatDateTime(last.ts, lang)}　<span className="nowrap">{localizeMedicineName(last.name, lang)}</span>
          </p>
        </>
      ) : (
        <p className="muted">{t('last.none')}</p>
      )}
    </div>
  )
}

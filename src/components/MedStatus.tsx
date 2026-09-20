import { useEffect, useState } from 'react'
import { formatElapsed, recordTitle } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
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

  if (!last || last.type !== 'medication') {
    return (
      <div className="med-status">
        <p className="med-status-empty">{t('last.none')}</p>
      </div>
    )
  }

  return (
    <div className="med-status">
      {/* 「ロキソニン 1錠を」の次の行に「最後に服薬してから」 */}
      <h3 className="med-status-title">
        <span className="nowrap">{t('last.drug', { drug: recordTitle(last, t, lang) })}</span>
        <br />
        {t('last.since')}
      </h3>
      <p className="med-status-time">{formatElapsed(now - last.ts, t)}</p>
    </div>
  )
}

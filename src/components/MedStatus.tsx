import { useEffect, useState } from 'react'
import { latestMedication, remainingUntilNextDose } from '../dosing.ts'
import { formatElapsed, recordTitle } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
import type { Medicine } from '../settings.ts'
import type { AppRecord } from '../types.ts'

/** 最後に薬を飲んでからの経過時間と、次の服薬が可能になるまでの時間。気圧カードの左下に置く */
export function MedStatus({ records, medicines }: { records: AppRecord[]; medicines: Medicine[] }) {
  const { t, lang } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // 薬が2種類以上記録されていても、最後に服薬したものを表示する
  const last = latestMedication(records)

  if (!last) {
    return (
      <div className="med-status">
        <p className="med-status-empty">{t('last.none')}</p>
      </div>
    )
  }

  // その薬に設定した服薬間隔（決めていなければ、次の服薬の行は出さない）
  const intervalHours = medicines.find((m) => m.name === last.name)?.intervalHours
  const remaining = remainingUntilNextDose(last.ts, intervalHours, now)

  return (
    <div className="med-status">
      {/* 「ロキソニン 1錠を」の次の行に「最後に服薬してから」。薬名と錠数は白の太字 */}
      <h3 className="med-status-title">
        <strong className="med-status-drug nowrap">{recordTitle(last, t, lang)}</strong>
        {t('last.drugSuffix')}
        <br />
        {t('last.since')}
      </h3>
      <p className="med-status-time">{formatElapsed(now - last.ts, t)}</p>
      {remaining !== null && (
        <p className="med-status-next" title={t('last.nextNote')}>
          {remaining === 0 ? t('last.nextOk') : t('last.nextIn', { time: formatElapsed(remaining, t) })}
        </p>
      )}
    </div>
  )
}

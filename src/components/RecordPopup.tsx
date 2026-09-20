import { useEffect } from 'react'
import { formatDateTime, recordTitle } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { colorFor, type Medicine } from '../settings.ts'
import { LEVEL_COLORS, type HeadacheRecord, type MedicationRecord } from '../types.ts'
import { PillIcon } from './PillIcon.tsx'
import { RecordPhoto } from './RecordPhoto.tsx'

interface Props {
  record: HeadacheRecord | MedicationRecord
  medicines: Medicine[]
  onClose: () => void
}

/**
 * グラフの頭痛レベルの丸・錠剤アイコン・付箋マークをタップした時に、
 * その記録の内容（レベルまたは薬・錠数、気圧、付箋メモ、写真）を表示するポップアップ
 */
export function RecordPopup({ record, medicines, onClose }: Props) {
  const { t, lang } = useI18n()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const photoId = record.type === 'medication' ? record.photoId : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-popup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row">
          <h2 id="record-popup-title">{t('popup.title')}</h2>
          <button className="link" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <p className="muted">{formatDateTime(record.ts, lang)}</p>
        <p className="med-name">
          {record.type === 'headache' ? (
            <span className="dot" style={{ background: LEVEL_COLORS[record.level] }} />
          ) : (
            <PillIcon color={colorFor(medicines, record.name)} size={20} />
          )}
          {recordTitle(record, t)}
          {record.pressure !== null && <span className="muted">　{record.pressure.toFixed(1)} hPa</span>}
        </p>
        {record.note && <p className="sticky-note">{record.note}</p>}
        {photoId && <RecordPhoto id={photoId} className="popup-photo" />}
        {!record.note && !photoId && <p className="muted">{t('popup.empty')}</p>}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { formatDateTime, tabletsLabel } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { localizeMedicineName } from '../medicineNames.ts'
import { colorFor, type Medicine } from '../settings.ts'
import { LEVEL_COLORS, type AppRecord, type HeadacheRecord, type MedicationRecord } from '../types.ts'
import { PillIcon } from './PillIcon.tsx'
import { RecordEditor } from './RecordEditor.tsx'
import { RecordPhoto } from './RecordPhoto.tsx'

interface Props {
  records: AppRecord[]
  medicines: Medicine[]
  onUpdate: (r: AppRecord) => Promise<void>
  onRemove: (r: AppRecord) => void
}

export function HistoryList({ records, medicines, onUpdate, onRemove }: Props) {
  const { t, lang } = useI18n()
  const [editingId, setEditingId] = useState<string | null>(null)
  // 気圧だけの自動記録は履歴に出さない（グラフで確認できる）
  const items = useMemo(
    () => records.filter((r): r is HeadacheRecord | MedicationRecord => r.type !== 'pressure').slice(0, 50),
    [records],
  )

  return (
    <section className="card">
      <h2>{t('history.title')}</h2>
      {items.length === 0 && <p className="muted">{t('history.empty')}</p>}
      <ul className="history">
        {items.map((r) => (
          <li key={r.id}>
            <div className="row">
              <span className="muted">{formatDateTime(r.ts, lang)}</span>
              <span>
                {editingId !== r.id && (
                  <button className="link" onClick={() => setEditingId(r.id)}>
                    {t('history.edit')}
                  </button>
                )}
                <button
                  className="link danger"
                  onClick={() => {
                    if (confirm(t('history.confirmDelete'))) onRemove(r)
                  }}
                >
                  {t('history.delete')}
                </button>
              </span>
            </div>
            {editingId === r.id ? (
              <RecordEditor
                record={r}
                medicines={medicines}
                onCancel={() => setEditingId(null)}
                onSave={async (updated) => {
                  await onUpdate(updated)
                  setEditingId(null)
                }}
              />
            ) : r.type === 'headache' ? (
              <p>
                <span className="dot" style={{ background: LEVEL_COLORS[r.level] }} />
                {t('history.headache', { level: r.level, label: t(`level.${r.level}`) })}
                {r.pressure !== null && <span className="muted">　{r.pressure.toFixed(1)} hPa</span>}
              </p>
            ) : (
              <>
                <p>
                  <PillIcon color={colorFor(medicines, r.name)} size={16} /> {localizeMedicineName(r.name, lang)}
                  {r.tablets !== undefined && <span> {tabletsLabel(r.tablets, t)}</span>}
                  {r.pressure !== null && <span className="muted">　{r.pressure.toFixed(1)} hPa</span>}
                </p>
                {r.photoId && <RecordPhoto id={r.photoId} className="thumb" />}
              </>
            )}
            {editingId !== r.id && r.note && <p className="sticky-note">{r.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

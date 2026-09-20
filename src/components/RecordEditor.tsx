import { useState } from 'react'
import { fromLocalInput, toLocalInput } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { canonicalMedicineName } from '../medicineNames.ts'
import type { Medicine } from '../settings.ts'
import type { AppRecord, HeadacheRecord, MedicationRecord } from '../types.ts'
import { LevelSlider } from './LevelSlider.tsx'
import { MedicineFields } from './MedicineFields.tsx'
import { StickyNoteField } from './StickyNoteField.tsx'

interface Props {
  record: HeadacheRecord | MedicationRecord
  medicines: Medicine[]
  onSave: (updated: AppRecord) => Promise<void>
  onCancel: () => void
}

/** 履歴の1件を編集する（日時・頭痛レベル／薬・錠数・メモ）。気圧と写真は記録時のまま */
export function RecordEditor({ record, medicines, onSave, onCancel }: Props) {
  const { t } = useI18n()
  const [when, setWhen] = useState(toLocalInput(record.ts))
  const [note, setNote] = useState(record.note)
  const [level, setLevel] = useState(record.type === 'headache' ? record.level : 0)
  const [name, setName] = useState(record.type === 'medication' ? record.name : '')
  const [tablets, setTablets] = useState(record.type === 'medication' ? (record.tablets ?? 1) : 1)

  const ts = fromLocalInput(when)
  const valid = ts !== null && (record.type === 'headache' || name.trim() !== '')

  const submit = async () => {
    if (ts === null || !valid) return
    const common = { ts, note: note.trim(), synced: false }
    await onSave(
      record.type === 'headache'
        ? { ...record, ...common, level }
        : { ...record, ...common, name: canonicalMedicineName(name), tablets },
    )
  }

  return (
    <div className="editor">
      <label className="field">
        {t('edit.when')}
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      {record.type === 'headache' ? (
        <LevelSlider value={level} onChange={setLevel} />
      ) : (
        <MedicineFields
          medicines={medicines}
          name={name}
          tablets={tablets}
          onName={setName}
          onTablets={setTablets}
        />
      )}
      <div className="field">
        {t('edit.note')}
        <StickyNoteField value={note} onChange={setNote} />
      </div>
      <div className="row">
        <button className="link" onClick={onCancel}>
          {t('edit.cancel')}
        </button>
        <button className="primary" disabled={!valid} onClick={submit}>
          {t('edit.save')}
        </button>
      </div>
    </div>
  )
}

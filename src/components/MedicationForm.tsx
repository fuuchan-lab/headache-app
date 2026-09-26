import { useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import { shrinkImage } from '../image.ts'
import { canonicalMedicineName } from '../medicineNames.ts'
import type { Medicine } from '../settings.ts'
import { MedicineFields } from './MedicineFields.tsx'
import { StickyNoteField } from './StickyNoteField.tsx'
import { WhenField } from './WhenField.tsx'

interface Props {
  medicines: Medicine[]
  /** ts は記録する日時。指定がなければ、記録する時の現在時刻 */
  onSave: (name: string, tablets: number, note: string, photo: Blob | null, ts: number) => Promise<void>
}

export function MedicationForm({ medicines, onSave }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState(medicines[0]?.name ?? '')
  const [tablets, setTablets] = useState(1)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  /** 過去にさかのぼって記録する日時。null なら指定なし（現在時刻で記録する） */
  const [customAt, setCustomAt] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  /** 過去の気圧を調べる間は保存に時間がかかる。その間の連続タップで、二重に登録しないための印 */
  const savingRef = useRef(false)
  const [photoError, setPhotoError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const blob = await shrinkImage(file)
      setPhoto(blob)
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(blob)
      })
      setPhotoError(false)
    } catch {
      setPhotoError(true)
    }
  }

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!name.trim() || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      await onSave(canonicalMedicineName(name), tablets, note.trim(), photo, customAt ?? Date.now())
    } finally {
      savingRef.current = false
      setSaving(false)
    }
    setNote('')
    setCustomAt(null)
    clearPhoto()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="card">
      <h2 className="form-title">{t('meds.title')}</h2>
      <MedicineFields
        medicines={medicines}
        name={name}
        tablets={tablets}
        onName={setName}
        onTablets={setTablets}
      />
      <StickyNoteField value={note} onChange={setNote} placeholder={t('meds.notePlaceholder')} />
      <div className="row">
        <label className="file-btn">
          {t('meds.photo')}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        {photo && (
          <button className="link" onClick={clearPhoto}>
            {t('meds.removePhoto')}
          </button>
        )}
      </div>
      {preview && <img className="preview" src={preview} alt={t('meds.photoAlt')} />}
      {photoError && <p className="error">{t('meds.photoError')}</p>}
      <WhenField value={customAt} onChange={setCustomAt} />
      <button className="primary" disabled={!name.trim() || saving} onClick={submit}>
        {t('meds.save')}
      </button>
      {saved && <p className="ok">{t('meds.saved')}</p>}
    </section>
  )
}

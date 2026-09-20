import { useRef, useState } from 'react'
import { shrinkImage } from '../image.ts'
import type { Medicine } from '../settings.ts'
import { MedicineFields } from './MedicineFields.tsx'
import { StickyNoteField } from './StickyNoteField.tsx'

interface Props {
  medicines: Medicine[]
  onSave: (name: string, tablets: number, note: string, photo: Blob | null) => Promise<void>
}

export function MedicationForm({ medicines, onSave }: Props) {
  const [name, setName] = useState(medicines[0]?.name ?? '')
  const [tablets, setTablets] = useState(1)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      setError(null)
    } catch {
      setError('写真を読み込めませんでした。')
    }
  }

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!name.trim()) return
    await onSave(name.trim(), tablets, note.trim(), photo)
    setNote('')
    clearPhoto()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="card">
      <h2>薬を飲んだ</h2>
      <MedicineFields
        medicines={medicines}
        name={name}
        tablets={tablets}
        onName={setName}
        onTablets={setTablets}
      />
      <StickyNoteField value={note} onChange={setNote} placeholder="付箋メモ（任意）例: 食後、頭痛がひどくなる前に" />
      <div className="row">
        <label className="file-btn">
          📷 写真を撮る／選ぶ
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
            写真を外す
          </button>
        )}
      </div>
      {preview && <img className="preview" src={preview} alt="服薬の写真" />}
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={!name.trim()} onClick={submit}>
        服薬を記録する
      </button>
      {saved && <p className="ok">記録しました</p>}
    </section>
  )
}

import { useRef, useState } from 'react'
import { formatDateTime } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'
import type { HeadacheLevel } from '../types.ts'
import { LevelSlider } from './LevelSlider.tsx'
import { StickyNoteField } from './StickyNoteField.tsx'

interface Props {
  pressure: number | null
  /** ts は頭痛レベルを選択した日時 */
  onSave: (level: HeadacheLevel, note: string, ts: number) => Promise<void>
}

export function HeadacheForm({ pressure, onSave }: Props) {
  const { t, lang } = useI18n()
  const [level, setLevel] = useState<HeadacheLevel>(0)
  /** スライダーで最後に選択した日時。null なら触っていない（初期値の 0 のまま。記録する時刻を日時にする） */
  const [selectedAt, setSelectedAt] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  /** 画面の更新が間に合わない素早い連続タップでも、二重に登録しないための印 */
  const savingRef = useRef(false)

  const pick = (l: HeadacheLevel) => {
    setLevel(l)
    setSelectedAt(Date.now())
  }

  const submit = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      await onSave(level, note.trim(), selectedAt ?? Date.now())
    } finally {
      savingRef.current = false
      setSaving(false)
    }
    setLevel(0)
    setSelectedAt(null)
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="card">
      <h2 className="form-title">{t('headache.title')}</h2>
      <LevelSlider value={level} onChange={pick} />
      {selectedAt !== null && (
        <p className="muted">{t('headache.selected', { time: formatDateTime(selectedAt, lang) })}</p>
      )}
      <StickyNoteField value={note} onChange={setNote} placeholder={t('headache.notePlaceholder')} />
      <button className="primary" disabled={saving} onClick={submit}>
        {t('headache.save')}
        {pressure !== null && `（${pressure.toFixed(1)} hPa）`}
      </button>
      {saved && <p className="ok">{t('headache.saved')}</p>}
    </section>
  )
}

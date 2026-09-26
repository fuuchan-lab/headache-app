import { useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import type { HeadacheLevel } from '../types.ts'
import { LevelSlider } from './LevelSlider.tsx'
import { StickyNoteField } from './StickyNoteField.tsx'
import { WhenField } from './WhenField.tsx'

interface Props {
  pressure: number | null
  /** ts は記録する日時。指定がなければ頭痛レベルを選択した日時 */
  onSave: (level: HeadacheLevel, note: string, ts: number) => Promise<void>
}

export function HeadacheForm({ pressure, onSave }: Props) {
  const { t } = useI18n()
  const [level, setLevel] = useState<HeadacheLevel>(0)
  /** スライダーで最後に選択した日時。null なら触っていない（初期値の 0 のまま。記録する時刻を日時にする） */
  const [selectedAt, setSelectedAt] = useState<number | null>(null)
  /** 過去にさかのぼって記録する日時。null なら指定なし（現在時刻で記録する） */
  const [customAt, setCustomAt] = useState<number | null>(null)
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
      await onSave(level, note.trim(), customAt ?? selectedAt ?? Date.now())
    } finally {
      savingRef.current = false
      setSaving(false)
    }
    setLevel(0)
    setSelectedAt(null)
    setCustomAt(null)
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="card">
      <h2 className="form-title">{t('headache.title')}</h2>
      <LevelSlider value={level} onChange={pick} />
      <StickyNoteField value={note} onChange={setNote} placeholder={t('headache.notePlaceholder')} />
      <WhenField value={customAt} onChange={setCustomAt} defaultTs={selectedAt} />
      <button className="primary" disabled={saving} onClick={submit}>
        {t('headache.save')}
        {customAt === null && pressure !== null && `（${pressure.toFixed(1)} hPa）`}
      </button>
      {saved && <p className="ok">{t('headache.saved')}</p>}
    </section>
  )
}

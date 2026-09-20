import { useState } from 'react'
import { formatDateTime } from '../format.ts'
import type { HeadacheLevel } from '../types.ts'
import { LevelSlider } from './LevelSlider.tsx'

interface Props {
  pressure: number | null
  /** ts は頭痛レベルを選択した日時 */
  onSave: (level: HeadacheLevel, note: string, ts: number) => Promise<void>
}

export function HeadacheForm({ pressure, onSave }: Props) {
  const [level, setLevel] = useState<HeadacheLevel>(0)
  /** スライダーで最後に選択した日時。null ならまだ選択していない */
  const [selectedAt, setSelectedAt] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const pick = (l: HeadacheLevel) => {
    setLevel(l)
    setSelectedAt(Date.now())
  }

  const submit = async () => {
    if (selectedAt === null) return
    await onSave(level, note.trim(), selectedAt)
    setLevel(0)
    setSelectedAt(null)
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="card">
      <h2>今の頭痛</h2>
      <LevelSlider value={level} onChange={pick} untouched={selectedAt === null} />
      {selectedAt !== null && <p className="muted">選択した日時: {formatDateTime(selectedAt)}</p>}
      <input
        type="text"
        placeholder="メモ（任意）例: こめかみがズキズキ"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="primary" disabled={selectedAt === null} onClick={submit}>
        記録する{pressure !== null && `（${pressure.toFixed(1)} hPa）`}
      </button>
      {saved && <p className="ok">記録しました。履歴から日時や内容を編集できます。</p>}
    </section>
  )
}

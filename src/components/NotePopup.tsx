import { useEffect } from 'react'
import { formatDateTime } from '../format.ts'
import { StickyIcon } from './StickyIcon.tsx'

export interface NoteMark {
  id: string
  /** 記録の日時 (epoch ms) */
  t: number
  /** 例: 「頭痛 3（痛い）」「ロキソニン 1錠」 */
  title: string
  text: string
}

/** グラフの付箋マークをタップした時に、メモを表示するポップアップ */
export function NotePopup({ note, onClose }: { note: NoteMark; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row">
          <h2 id="note-title" className="med-name">
            <StickyIcon size={22} />
            メモ
          </h2>
          <button className="link" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <p className="muted">
          {formatDateTime(note.t)}　{note.title}
        </p>
        <p className="sticky-note">{note.text}</p>
      </div>
    </div>
  )
}

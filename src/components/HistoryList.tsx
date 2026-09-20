import { useEffect, useState } from 'react'
import { getPhoto } from '../db.ts'
import { formatDateTime } from '../format.ts'
import {
  LEVEL_COLORS,
  LEVEL_LABELS,
  type AppRecord,
  type HeadacheRecord,
  type MedicationRecord,
} from '../types.ts'
import { colorFor, type Medicine } from '../settings.ts'
import { PillIcon } from './PillIcon.tsx'
import { RecordEditor } from './RecordEditor.tsx'

function Photo({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    void getPhoto(id).then((p) => {
      if (p && !cancelled) {
        objectUrl = URL.createObjectURL(p.blob)
        setUrl(objectUrl)
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url ? <img className="thumb" src={url} alt="服薬の写真" /> : null
}

interface Props {
  records: AppRecord[]
  medicines: Medicine[]
  onUpdate: (r: AppRecord) => Promise<void>
  onRemove: (r: AppRecord) => void
}

export function HistoryList({ records, medicines, onUpdate, onRemove }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  // 気圧だけの自動記録は履歴に出さない（グラフで確認できる）
  const items = records
    .filter((r): r is HeadacheRecord | MedicationRecord => r.type !== 'pressure')
    .slice(0, 50)

  return (
    <section className="card">
      <h2>履歴</h2>
      {items.length === 0 && <p className="muted">まだ記録がありません。</p>}
      <ul className="history">
        {items.map((r) => (
          <li key={r.id}>
            <div className="row">
              <span className="muted">{formatDateTime(r.ts)}</span>
              <span>
                {editingId !== r.id && (
                  <button className="link" onClick={() => setEditingId(r.id)}>
                    編集
                  </button>
                )}
                <button
                  className="link danger"
                  onClick={() => {
                    if (confirm('この記録を削除しますか？')) onRemove(r)
                  }}
                >
                  削除
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
                頭痛 {r.level}（{LEVEL_LABELS[r.level]}）
                {r.pressure !== null && <span className="muted">　{r.pressure.toFixed(1)} hPa</span>}
              </p>
            ) : (
              <>
                <p>
                  <PillIcon color={colorFor(medicines, r.name)} size={16} /> {r.name}
                  {r.tablets !== undefined && <span> {r.tablets}錠</span>}
                  {r.pressure !== null && <span className="muted">　{r.pressure.toFixed(1)} hPa</span>}
                </p>
                {r.photoId && <Photo id={r.photoId} />}
              </>
            )}
            {editingId !== r.id && r.note && <p className="sticky-note">{r.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

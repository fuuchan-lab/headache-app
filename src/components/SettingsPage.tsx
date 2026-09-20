import { useState } from 'react'
import type { Medicine } from '../settings.ts'
import { PillIcon } from './PillIcon.tsx'

interface Props {
  medicines: Medicine[]
  onAdd: (name: string) => boolean
  onRemove: (id: string) => void
}

export function SettingsPage({ medicines, onAdd, onRemove }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (onAdd(name)) {
      setName('')
      setError(null)
    } else {
      setError(name.trim() ? '同じ名前の薬がすでにあります。' : '薬の名前を入力してください。')
    }
  }

  return (
    <section className="card">
      <h2>薬の設定</h2>
      <p className="muted">
        服薬を記録する時に選べる薬です。グラフの錠剤アイコンはここで決まる色で表示されます。
        過去の記録は、薬を削除しても消えません。
      </p>
      <ul className="history">
        {medicines.map((m) => (
          <li key={m.id} className="row">
            <span className="med-name">
              <PillIcon color={m.color} size={22} />
              {m.name}
            </span>
            <button
              className="link danger"
              onClick={() => {
                if (confirm(`「${m.name}」を設定から削除しますか？`)) onRemove(m.id)
              }}
            >
              削除
            </button>
          </li>
        ))}
        {medicines.length === 0 && <li className="muted">薬が設定されていません。</li>}
      </ul>
      <div className="two">
        <input
          type="text"
          className="grow"
          placeholder="薬の名前を追加 例: イブ"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
          }}
        />
        <button className="primary" onClick={submit}>
          追加
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  )
}

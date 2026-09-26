import { useEffect, useRef, useState } from 'react'
import { formatWhen, fromLocalInput, toLocalInput } from '../format.ts'
import { useI18n } from '../i18n/useI18n.ts'

interface Props {
  /** 指定した日時 (epoch ms)。null なら指定なし（既定の日時で記録する） */
  value: number | null
  onChange: (ts: number | null) => void
  /** 指定なしの時に表示する日時。省略すると現在時刻（30秒ごとに更新） */
  defaultTs?: number | null
}

/** 表示のために現在時刻を持つ。分が変わるのに間に合うよう、30秒ごとに更新する（paused の間は更新しない） */
function useNow(paused: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [paused])
  return now
}

/**
 * 記録する日時の表示と変更。「記録する」ボタンの上に置く。
 * 既定では現在時刻を表示し、タップすると過去の日時を選べる（未来は選べない）。
 */
export function WhenField({ value, onChange, defaultTs = null }: Props) {
  const { t, lang } = useI18n()
  /** 日時を入力している間は、入力中の値が書き換わらないように、現在時刻の更新を止める */
  const [editing, setEditing] = useState(false)
  const now = useNow(editing)
  const inputRef = useRef<HTMLInputElement>(null)
  const custom = value !== null
  const shown = value ?? defaultTs ?? now

  const change = (raw: string) => {
    const ts = fromLocalInput(raw)
    // 消された時は既定（現在時刻）に戻す。未来の日時は、いまの時刻にそろえる
    onChange(ts === null ? null : Math.min(ts, Date.now()))
  }

  return (
    <div className="when-field">
      {/* 透明な日時入力を表示の上に重ねる。タップすると、その端末の日時の選択画面が開く */}
      <div className={`when-box${custom ? ' custom' : ''}`}>
        <span className="when-label">{t('when.label')}</span>
        <span className="when-time">{formatWhen(shown, lang, now)}</span>
        <input
          ref={inputRef}
          className="when-input"
          type="datetime-local"
          aria-label={t('when.change')}
          value={toLocalInput(shown)}
          max={toLocalInput(now)}
          onChange={(e) => change(e.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          onClick={() => {
            // パソコンでは、入力欄の中央をクリックしても選択画面が開かないので、開く
            try {
              inputRef.current?.showPicker()
            } catch {
              // showPicker が使えない、または開けない環境では、標準の動作のまま
            }
          }}
        />
      </div>
      {custom ? (
        <>
          <p className="muted small">{t('when.pastNote')}</p>
          <button type="button" className="link" onClick={() => onChange(null)}>
            {t('when.reset')}
          </button>
        </>
      ) : (
        <p className="muted small">{t('when.tapHint')}</p>
      )}
    </div>
  )
}

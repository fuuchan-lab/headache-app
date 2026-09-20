import { useState } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import { canonicalMedicineName, localizeMedicineName } from '../medicineNames.ts'
import { INTERVAL_MAX_HOURS, INTERVAL_MIN_HOURS, MEDICINE_COLORS, parseIntervalHours, type Medicine } from '../settings.ts'
import { PillIcon } from './PillIcon.tsx'

export type EditResult = 'ok' | 'empty' | 'duplicate'

interface Props {
  medicine: Medicine
  /** 名前を変えた時に、一緒に直る過去の記録の件数 */
  affectedCount: number
  /** intervalHours は服薬間隔（時間）。空欄なら null */
  onSave: (name: string, color: string, intervalHours: number | null) => Promise<EditResult>
  onCancel: () => void
}

/** 薬の名前・服薬間隔・色を変える（初期の薬も、登録した薬も同じ） */
export function MedicineEditor({ medicine, affectedCount, onSave, onCancel }: Props) {
  const { t, lang } = useI18n()
  const [name, setName] = useState(localizeMedicineName(medicine.name, lang))
  const [interval, setInterval] = useState(medicine.intervalHours?.toString() ?? '')
  const [color, setColor] = useState(medicine.color)
  const [error, setError] = useState<'empty' | 'duplicate' | 'interval' | null>(null)

  const colors = [...new Set([medicine.color, ...MEDICINE_COLORS])]
  const renaming = name.trim() !== '' && canonicalMedicineName(name) !== medicine.name

  const submit = async () => {
    const parsed = parseIntervalHours(interval)
    if (!parsed.ok) {
      setError('interval')
      return
    }
    const result = await onSave(name, color, parsed.hours)
    if (result === 'ok') onCancel()
    else setError(result)
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) void submit()
  }

  const errorText = { empty: 'settings.errEmpty', duplicate: 'settings.errDup', interval: 'settings.errInterval' } as const

  return (
    <div className="editor">
      <div className="field">
        <label htmlFor="medicine-name">{t('settings.nameLabel')}</label>
        {/* 名前の左のカプセルは、下で選んだ色にすぐ変わる */}
        <div className="name-row">
          <PillIcon color={color} size={42} />
          <input
            id="medicine-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={onEnter}
          />
        </div>
      </div>
      {/* 薬の名前のすぐ下に、左に服薬間隔（空欄でもよい）、右に色の選択 */}
      <div className="interval-color">
        <div className="field">
          <label htmlFor="medicine-interval">{t('settings.intervalLabel')}</label>
          <div className="interval-row">
            <input
              id="medicine-interval"
              type="number"
              inputMode="decimal"
              min={INTERVAL_MIN_HOURS}
              max={INTERVAL_MAX_HOURS}
              step={0.5}
              placeholder={t('settings.intervalPlaceholder')}
              value={interval}
              onChange={(e) => {
                setInterval(e.target.value)
                setError(null)
              }}
              onKeyDown={onEnter}
            />
            <span>{t('settings.intervalUnit')}</span>
          </div>
          <span className="muted small">{t('settings.intervalHelp')}</span>
        </div>
        <div className="field" role="radiogroup" aria-label={t('settings.colorLabel')}>
          {t('settings.colorLabel')}
          <div className="swatches">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={c}
                className="swatch-btn"
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      </div>
      {renaming && affectedCount > 0 && <p className="muted">{t('settings.renameNote', { n: affectedCount })}</p>}
      {error && <p className="error">{t(errorText[error])}</p>}
      <div className="row">
        <button className="link" onClick={onCancel}>
          {t('edit.cancel')}
        </button>
        <button className="primary" onClick={() => void submit()}>
          {t('edit.save')}
        </button>
      </div>
    </div>
  )
}

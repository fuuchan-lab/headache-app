import { useState } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import { canonicalMedicineName, localizeMedicineName } from '../medicineNames.ts'
import { MEDICINE_COLORS, type Medicine } from '../settings.ts'

export type EditResult = 'ok' | 'empty' | 'duplicate'

interface Props {
  medicine: Medicine
  /** 名前を変えた時に、一緒に直る過去の記録の件数 */
  affectedCount: number
  onSave: (name: string, color: string) => Promise<EditResult>
  onCancel: () => void
}

/** 薬の名前と色を変える（初期の薬も、登録した薬も同じ） */
export function MedicineEditor({ medicine, affectedCount, onSave, onCancel }: Props) {
  const { t, lang } = useI18n()
  const [name, setName] = useState(localizeMedicineName(medicine.name, lang))
  const [color, setColor] = useState(medicine.color)
  const [error, setError] = useState<Exclude<EditResult, 'ok'> | null>(null)

  const colors = [...new Set([medicine.color, ...MEDICINE_COLORS])]
  const renaming = name.trim() !== '' && canonicalMedicineName(name) !== medicine.name

  const submit = async () => {
    const result = await onSave(name, color)
    if (result === 'ok') onCancel()
    else setError(result)
  }

  return (
    <div className="editor">
      <label className="field">
        {t('settings.nameLabel')}
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) void submit()
          }}
        />
      </label>
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
      {renaming && affectedCount > 0 && <p className="muted">{t('settings.renameNote', { n: affectedCount })}</p>}
      {error && <p className="error">{t(error === 'duplicate' ? 'settings.errDup' : 'settings.errEmpty')}</p>}
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

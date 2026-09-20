import { useState } from 'react'
import { driveConfig } from '../drive.ts'
import type { Lang } from '../i18n/context.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { localizeMedicineName } from '../medicineNames.ts'
import type { Medicine } from '../settings.ts'
import type { AppRecord } from '../types.ts'
import { MedicineEditor, type EditResult } from './MedicineEditor.tsx'
import { PillIcon } from './PillIcon.tsx'

interface Props {
  medicines: Medicine[]
  onAdd: (name: string) => boolean
  /** 名前・色を変える。名前を変えた時は、過去の記録の薬名も直す */
  onEdit: (id: string, name: string, color: string) => Promise<EditResult>
  onRemove: (id: string) => void
  /** 書き出す記録（削除済みを除く） */
  records: AppRecord[]
  /** Google にログインしているか（Excel は Google ドライブに保存するため必要） */
  loggedIn: boolean
}

type ExportState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; name: string; id: string }
  | { status: 'error' }

export function SettingsPage({ medicines, onAdd, onEdit, onRemove, records, loggedIn }: Props) {
  const { t, lang, setLang } = useI18n()
  const [name, setName] = useState('')
  const [error, setError] = useState<'empty' | 'duplicate' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [exp, setExp] = useState<ExportState>({ status: 'idle' })

  const submit = () => {
    if (onAdd(name)) {
      setName('')
      setError(null)
    } else {
      setError(name.trim() ? 'duplicate' : 'empty')
    }
  }

  const runExport = async () => {
    setExp({ status: 'busy' })
    try {
      // Excel 出力のライブラリは、使う時だけ読み込む
      const { exportToDrive } = await import('../exportExcel.ts')
      const result = await exportToDrive(records, t, lang)
      setExp({ status: 'done', ...result })
    } catch (e) {
      console.error('[export]', e)
      setExp({ status: 'error' })
    }
  }

  const noRecords = records.length === 0

  return (
    <>
      <section className="card">
        <div className="row">
          <h2>{t('settings.language')}</h2>
          <select
            className="language-select"
            value={lang}
            aria-label={t('settings.language')}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </section>

      <section className="card">
        <h2>{t('settings.meds')}</h2>
        <p className="muted">{t('settings.medsHelp')}</p>
        <ul className="history">
          {medicines.map((m) => {
            const shown = localizeMedicineName(m.name, lang)
            if (editingId === m.id) {
              return (
                <li key={m.id}>
                  <MedicineEditor
                    medicine={m}
                    affectedCount={records.filter((r) => r.type === 'medication' && r.name === m.name).length}
                    onSave={(newName, color) => onEdit(m.id, newName, color)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              )
            }
            return (
              <li key={m.id} className="row">
                <span className="med-name">
                  <PillIcon color={m.color} size={22} />
                  {shown}
                </span>
                <span>
                  <button className="link" onClick={() => setEditingId(m.id)}>
                    {t('history.edit')}
                  </button>
                  <button
                    className="link danger"
                    onClick={() => {
                      if (confirm(t('settings.confirmRemove', { name: shown }))) onRemove(m.id)
                    }}
                  >
                    {t('history.delete')}
                  </button>
                </span>
              </li>
            )
          })}
          {medicines.length === 0 && <li className="muted">{t('settings.none')}</li>}
        </ul>
        <div className="two">
          <input
            type="text"
            className="grow"
            placeholder={t('settings.addPlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
            }}
          />
          <button className="primary" onClick={submit}>
            {t('settings.add')}
          </button>
        </div>
        {error && <p className="error">{t(error === 'duplicate' ? 'settings.errDup' : 'settings.errEmpty')}</p>}
      </section>

      <section className="card">
        <h2>{t('export.title')}</h2>
        <p className="muted">{t('export.help', { folder: driveConfig.folderName })}</p>
        <button
          className="primary"
          disabled={!loggedIn || noRecords || exp.status === 'busy'}
          onClick={() => void runExport()}
        >
          {exp.status === 'busy' ? t('export.busy') : t('export.button')}
        </button>
        {!loggedIn && <p className="muted">{t('export.needLogin')}</p>}
        {loggedIn && noRecords && <p className="muted">{t('export.noRecords')}</p>}
        {exp.status === 'done' && (
          <p className="ok" role="status">
            {t('export.done', { name: exp.name })}{' '}
            <a href={`https://drive.google.com/file/d/${exp.id}/view`} target="_blank" rel="noopener noreferrer">
              {t('export.open')}
            </a>
          </p>
        )}
        {exp.status === 'error' && (
          <p className="error" role="alert">
            {t('export.failed')}
          </p>
        )}
      </section>
    </>
  )
}

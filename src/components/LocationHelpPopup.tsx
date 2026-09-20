import { useEffect } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import { LOCATION_STEPS, detectPlatform } from '../locationHelp.ts'

interface Props {
  onClose: () => void
  /** 設定を直したあとに、位置情報の取得をやり直す */
  onRetry: () => void
}

/** 位置情報を許可する手順の案内。端末（iPhone / Android / パソコン）に合わせた手順を出す */
export function LocationHelpPopup({ onClose, onRetry }: Props) {
  const { t, lang } = useI18n()
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints)
  const steps = LOCATION_STEPS[lang][platform]

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
        aria-labelledby="location-help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row">
          <h2 id="location-help-title">📍 {t('loc.title')}</h2>
          <button className="link" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <p className="muted">{t('loc.why')}</p>
        <h3 className="loc-platform">{t(`loc.platform.${platform}`)}</h3>
        <ol className="loc-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="muted small">{t('loc.inApp')}</p>
        <button
          className="primary"
          onClick={() => {
            onClose()
            onRetry()
          }}
        >
          {t('loc.retry')}
        </button>
      </div>
    </div>
  )
}

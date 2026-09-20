import { useEffect, useState } from 'react'
import { ADVICE, type AdviceSection } from '../advice.ts'
import { useI18n } from '../i18n/useI18n.ts'
import type { TrendDirection } from '../warning.ts'

type Tab = 'falling' | 'rising'

interface Props {
  /** いまの気圧の予報の向き。開いた時に、対応するタブを選ぶ */
  direction: TrendDirection
  onClose: () => void
}

function Section({ section, separator }: { section: AdviceSection; separator: string }) {
  return (
    <section className="advice-section">
      <h3>{section.title}</h3>
      {section.intro && <p>{section.intro}</p>}
      <ul>
        {section.items.map((item) => (
          <li key={item.lead}>
            <strong>{item.lead}</strong>
            {separator}
            {item.body}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 気圧が下降・上昇する時のアドバイスと、どちらにも共通するセルフケア */
export function AdvicePopup({ direction, onClose }: Props) {
  const { t, lang } = useI18n()
  // 安定している時は、下降のアドバイスから見せる（気圧の低下が頭痛のきっかけになりやすいため）
  const [tab, setTab] = useState<Tab>(direction === 'rising' ? 'rising' : 'falling')
  const content = ADVICE[lang]

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
        className="modal-card advice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="advice-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row">
          <h2 id="advice-title">💡 {t('advice.title')}</h2>
          <button className="link" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <p className="muted">{t(`advice.now.${direction}`)}</p>
        <div className="seg" role="tablist">
          {(['falling', 'rising'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => setTab(k)}
            >
              {t(`advice.tab.${k}`)}
            </button>
          ))}
        </div>
        <Section section={content[tab]} separator={content.separator} />
        <Section section={content.common} separator={content.separator} />
        <p className="muted small">{t('advice.disclaimer')}</p>
      </div>
    </div>
  )
}

import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import type { MessageKey } from '../i18n/messages.ts'
import { AdBanner } from './AdBanner.tsx'

export type Tab = 'record' | 'list' | 'dashboard' | 'settings'

// アイコンは currentColor の塗り。抜き部分は .cut / .cutline（ドックの背景色で塗る）
const ICONS = {
  record: (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.8" y="2.6" width="14.6" height="18.8" rx="2.8" fill="currentColor" />
      <rect className="cut" x="6" y="7" width="8" height="1.7" rx=".85" />
      <rect className="cut" x="6" y="10.7" width="8" height="1.7" rx=".85" />
      <rect className="cut" x="6" y="14.4" width="4" height="1.7" rx=".85" />
      <g transform="rotate(45 17.6 14.6)">
        <path
          className="cutline"
          d="M15.9 7.4h3.4v9.4l-1.7 3.6-1.7-3.6z"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M15.9 7.4h3.4v9.4l-1.7 3.6-1.7-3.6z" fill="currentColor" />
        <rect className="cut" x="15.9" y="9.6" width="3.4" height=".9" />
      </g>
    </svg>
  ),
  list: (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <rect x="2.8" y="3.4" width="5.2" height="4.8" rx="1.4" />
        <rect x="10" y="3.6" width="11" height="2.1" rx="1.05" />
        <rect x="10" y="6.6" width="7" height="1.6" rx=".8" opacity=".55" />
        <rect x="2.8" y="9.6" width="5.2" height="4.8" rx="1.4" />
        <rect x="10" y="9.8" width="11" height="2.1" rx="1.05" />
        <rect x="10" y="12.8" width="7" height="1.6" rx=".8" opacity=".55" />
        <rect x="2.8" y="15.8" width="5.2" height="4.8" rx="1.4" />
        <rect x="10" y="16" width="11" height="2.1" rx="1.05" />
        <rect x="10" y="19" width="7" height="1.6" rx=".8" opacity=".55" />
      </g>
    </svg>
  ),
  dashboard: (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <rect x="3" y="11.5" width="4.6" height="9" rx="1.4" opacity=".6" />
        <rect x="9.7" y="3.5" width="4.6" height="17" rx="1.4" />
        <rect x="16.4" y="8" width="4.6" height="12.5" rx="1.4" opacity=".8" />
      </g>
    </svg>
  ),
  settings: (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect key={deg} x="10.2" y="1.6" width="3.6" height="5.4" rx="1.1" transform={`rotate(${deg} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="7.4" />
      </g>
      <circle className="cut" cx="12" cy="12" r="3.2" />
    </svg>
  ),
  help: (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.6" fill="currentColor" />
      <path
        className="cutline"
        d="M9.3 9.6a2.75 2.75 0 1 1 4.3 2.25c-.95.65-1.6 1.15-1.6 2.35"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle className="cut" cx="12" cy="17" r="1.2" />
    </svg>
  ),
}

const TABS: { tab: Tab; label: MessageKey; icon: ReactNode }[] = [
  { tab: 'record', label: 'nav.record', icon: ICONS.record },
  { tab: 'list', label: 'nav.list', icon: ICONS.list },
  { tab: 'dashboard', label: 'nav.dashboard', icon: ICONS.dashboard },
  { tab: 'settings', label: 'nav.settings', icon: ICONS.settings },
]

interface Props {
  tab: Tab
  onTab: (tab: Tab) => void
}

/** 画面の下に固定する「広告 + ナビゲーションボタン」。広告はナビの真上に置き、表示される時だけ場所を取る */
export function BottomDock({ tab, onTab }: Props) {
  const { t, lang } = useI18n()
  const ref = useRef<HTMLDivElement>(null)

  // ドックの高さ（広告の有無で変わる）を --dock-h に入れ、本体が隠れないように余白を取る
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--dock-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="bottom-dock" ref={ref}>
      <AdBanner />
      <nav className="bottom-nav" aria-label={t('nav.menu')}>
        {TABS.map(({ tab: id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item${tab === id ? ' active' : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTab(id)}
          >
            {icon}
            <span>{t(label)}</span>
          </button>
        ))}
        <a className="nav-item" href={`./help.html?lang=${lang}`} target="_blank" rel="noopener">
          {ICONS.help}
          <span>{t('nav.help')}</span>
        </a>
      </nav>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { GoogleAuth } from '../hooks/useGoogleAuth.ts'

interface Props {
  view: 'home' | 'settings'
  onToggleSettings: () => void
  auth: GoogleAuth
}

/** アプリ名・設定ボタン・Googleログインボタン（CapLog と同じ並び） */
export function Header({ view, onToggleSettings, auth }: Props) {
  const { account, connecting, login } = auth
  const [accountOpen, setAccountOpen] = useState(false)

  const label = connecting ? '接続中…' : account ? 'Google接続中' : 'ログイン'

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">頭痛・服薬・気圧の記録帳</p>
          <h1>頭痛ログ</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            onClick={onToggleSettings}
            aria-label={view === 'home' ? '設定を開く' : '設定を閉じる'}
            title={view === 'home' ? '設定' : '戻る'}
          >
            {view === 'home' ? '⚙' : '←'}
          </button>
          <button
            className="google-button"
            disabled={connecting}
            onClick={() => (account ? setAccountOpen(true) : void login())}
          >
            <span
              className="google-mark"
              aria-hidden="true"
              style={account?.avatarUrl ? { backgroundImage: `url(${account.avatarUrl})` } : undefined}
            >
              {!account?.avatarUrl && <span className="google-mark-inner">G</span>}
            </span>
            <span className="google-text">{label}</span>
          </button>
        </div>
      </header>

      {auth.notice && (
        <p
          className={`banner ${auth.notice.kind === 'ok' ? 'banner-none' : 'banner-warning'}`}
          role={auth.notice.kind === 'ok' ? 'status' : 'alert'}
          onClick={auth.dismissNotice}
        >
          {auth.notice.text}
        </p>
      )}

      {accountOpen && account && (
        <AccountModal
          account={account}
          onClose={() => setAccountOpen(false)}
          onSwitch={() => {
            setAccountOpen(false)
            void auth.switchAccount()
          }}
          onSignOut={() => {
            setAccountOpen(false)
            auth.signOut()
          }}
        />
      )}
    </>
  )
}

interface ModalProps {
  account: NonNullable<GoogleAuth['account']>
  onClose: () => void
  onSwitch: () => void
  onSignOut: () => void
}

function AccountModal({ account, onClose, onSwitch, onSignOut }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="account-title" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 id="account-title">アカウント</h2>
          <button className="link" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <p>{account.email ?? account.name ?? 'Googleアカウント'}</p>
        <p className="muted">データの保存先: Google ドライブの「頭痛と気圧の記録」フォルダー</p>
        <button className="secondary" onClick={onSwitch}>
          アカウントを切り替え
        </button>
        <button className="danger-btn" onClick={onSignOut}>
          ログアウト
        </button>
      </div>
    </div>
  )
}

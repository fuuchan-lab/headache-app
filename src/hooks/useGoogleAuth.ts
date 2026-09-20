import { useCallback, useEffect, useState } from 'react'
import { describeError } from '../errors.ts'
import type { Vars } from '../i18n/context.ts'
import type { MessageKey } from '../i18n/messages.ts'
import { clearSyncIndex } from '../sync.ts'
import {
  clearToken,
  driveConfig,
  ensureFolder,
  fetchUserInfo,
  getAccessToken,
  hasSession,
  isDriveConfigured,
  setSession,
  signOutDrive,
  restoreStoredToken,
} from '../drive.ts'

export interface DriveAccount {
  email: string | null
  name: string | null
  avatarUrl: string | null
  folderId: string
}

/** 画面に出すお知らせ。文言は表示時に言語に合わせて作る */
export interface Notice {
  kind: 'ok' | 'error'
  key: MessageKey
  vars?: Vars
  /** 原因の切り分け用の詳細（スマホなど、開発者ツールを使えない環境で分かるように画面に出す） */
  detail?: string
}

// 開発時の StrictMode で復元処理が2回走らないようにする
let restoreStarted = false

export function useGoogleAuth() {
  const [account, setAccount] = useState<DriveAccount | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const say = useCallback((n: Notice) => {
    setNotice(n)
    setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), 8000)
  }, [])

  /** ログインしてドライブのフォルダーを確保する。成功したら true */
  const connect = useCallback(
    async (prompt: string | null = null, restoring = false): Promise<boolean> => {
      if (!isDriveConfigured()) {
        say({ kind: 'error', key: 'notice.noClientId' })
        return false
      }
      setConnecting(true)
      try {
        if (restoring) {
          // 前回のトークンが有効ならそれを使う（サードパーティCookieを止めるブラウザでは無言の再取得が失敗するため）
          if (!restoreStoredToken()) await getAccessToken(false)
        } else {
          await getAccessToken(true, prompt)
        }
        const folderId = await ensureFolder()
        const info = await fetchUserInfo()
        setSession(true)
        setAccount({ email: info.email, name: info.name, avatarUrl: info.picture, folderId })
        return true
      } catch (e) {
        setAccount(null)
        setSession(false)
        clearToken()
        const cancelled = e instanceof Error && e.message === 'popup_closed'
        if (!restoring && !cancelled) {
          console.error('[login]', e)
          say({ kind: 'error', key: 'notice.loginFailed', detail: describeError(e) })
        }
        return false
      } finally {
        setConnecting(false)
      }
    },
    [say],
  )

  useEffect(() => {
    if (restoreStarted) return
    restoreStarted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isDriveConfigured() && hasSession()) void connect(null, true)
  }, [connect])

  const login = useCallback(async () => {
    if (await connect()) {
      say({ kind: 'ok', key: 'notice.loggedIn', vars: { folder: driveConfig.folderName } })
    }
  }, [connect, say])

  const signOut = useCallback(() => {
    signOutDrive()
    clearSyncIndex()
    setAccount(null)
  }, [])

  const switchAccount = useCallback(async () => {
    signOutDrive()
    clearSyncIndex()
    setAccount(null)
    if (await connect('select_account')) {
      say({ kind: 'ok', key: 'notice.switched' })
    }
  }, [connect, say])

  return { account, connecting, notice, dismissNotice: () => setNotice(null), login, signOut, switchAccount }
}

export type GoogleAuth = ReturnType<typeof useGoogleAuth>

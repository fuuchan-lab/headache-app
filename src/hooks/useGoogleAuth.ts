import { useCallback, useEffect, useState } from 'react'
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

export interface Notice {
  kind: 'ok' | 'error'
  text: string
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
        say({ kind: 'error', text: 'Google のクライアントIDが設定されていません。' })
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
          say({ kind: 'error', text: 'Googleへのログインに失敗しました。もう一度お試しください。' })
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
      say({
        kind: 'ok',
        text: `Googleアカウントでログインしました。データは Google ドライブの「${driveConfig.folderName}」フォルダーに保存されます。`,
      })
    }
  }, [connect, say])

  const signOut = useCallback(() => {
    signOutDrive()
    setAccount(null)
  }, [])

  const switchAccount = useCallback(async () => {
    signOutDrive()
    setAccount(null)
    if (await connect('select_account')) {
      say({ kind: 'ok', text: 'アカウントを切り替えました。' })
    }
  }, [connect, say])

  return { account, connecting, notice, dismissNotice: () => setNotice(null), login, signOut, switchAccount }
}

export type GoogleAuth = ReturnType<typeof useGoogleAuth>

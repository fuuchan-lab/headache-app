import { useCallback, useEffect, useRef, useState } from 'react'
import { syncNow } from '../sync.ts'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

const FOCUS_SYNC_INTERVAL = 60_000

/**
 * ログイン中、次のタイミングで Google ドライブと同期する。
 * - ログインした時、未同期の記録が増えた時（少し待ってまとめて）
 * - 画面に戻った時、オンラインに戻った時（前回から1分以上たっていれば）
 * - 「今すぐ同期」を押した時
 * 失敗した場合は、上のいずれかの次の機会に再試行する。
 */
export function useSync(loggedIn: boolean, unsyncedCount: number, reload: () => Promise<void>) {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const lastRunRef = useRef(0)

  const run = useCallback(async () => {
    lastRunRef.current = Date.now()
    setStatus('syncing')
    try {
      const result = await syncNow()
      if (result.changedLocal) await reload()
      setLastSyncAt(Date.now())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }, [reload])

  // ログイン直後に同期
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loggedIn) void run()
  }, [loggedIn, run])

  // 未同期の記録ができたら、少し待ってからまとめて同期
  useEffect(() => {
    if (!loggedIn || unsyncedCount === 0) return
    const id = setTimeout(() => void run(), 1500)
    return () => clearTimeout(id)
  }, [loggedIn, unsyncedCount, run])

  // 画面に戻った時・オンラインに戻った時
  useEffect(() => {
    if (!loggedIn) return
    const trigger = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRunRef.current > FOCUS_SYNC_INTERVAL) {
        void run()
      }
    }
    const onOnline = () => void run()
    document.addEventListener('visibilitychange', trigger)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', trigger)
      window.removeEventListener('online', onOnline)
    }
  }, [loggedIn, run])

  return { status: loggedIn ? status : 'idle', lastSyncAt, syncNow: run }
}

export type SyncState = ReturnType<typeof useSync>

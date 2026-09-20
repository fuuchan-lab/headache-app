import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError } from '../errors.ts'
import { syncNow } from '../sync.ts'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'offline'

const FOCUS_SYNC_INTERVAL = 60_000

/**
 * ログイン中、次のタイミングで Google ドライブと同期する。
 * - ログインした時、未同期の記録が増えた時（少し待ってまとめて）
 * - 画面に戻った時、オンラインに戻った時（前回から1分以上たっていれば）
 * - 「今すぐ同期」を押した時
 * 失敗した場合は、上のいずれかの次の機会に再試行する。
 */
export function useSync(
  loggedIn: boolean,
  unsyncedCount: number,
  /** 薬の設定に、ドライブへ反映していない変更があるか */
  medicinesDirty: boolean,
  reload: () => Promise<void>,
  /** 同期が終わるたびに呼ぶ（薬の設定の表示を、保存内容に合わせ直すため） */
  onSynced: () => void,
) {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  /** 直近の同期が失敗した時の、原因の詳細 */
  const [error, setError] = useState<string | null>(null)
  const lastRunRef = useRef(0)

  const run = useCallback(async () => {
    // 電波がない間は同期を試さない（記録は端末に残り、ネットが戻ったら同期する）
    if (navigator.onLine === false) {
      setStatus('offline')
      return
    }
    lastRunRef.current = Date.now()
    setStatus('syncing')
    try {
      const result = await syncNow()
      if (result.changedLocal) await reload()
      onSynced()
      setLastSyncAt(Date.now())
      setError(null)
      setStatus('ok')
    } catch (e) {
      console.error('[sync]', e)
      setError(describeError(e))
      setStatus('error')
    }
  }, [reload, onSynced])

  // ログイン直後に同期
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loggedIn) void run()
  }, [loggedIn, run])

  // 未同期の記録や薬の設定の変更ができたら、少し待ってからまとめて同期
  const pending = unsyncedCount + (medicinesDirty ? 1 : 0)
  useEffect(() => {
    if (!loggedIn || pending === 0) return
    const id = setTimeout(() => void run(), 1500)
    return () => clearTimeout(id)
  }, [loggedIn, pending, run])

  // 画面に戻った時・オンラインに戻った時
  useEffect(() => {
    if (!loggedIn) return
    const trigger = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRunRef.current > FOCUS_SYNC_INTERVAL) {
        void run()
      }
    }
    const onOnline = () => void run()
    const onOffline = () => setStatus('offline')
    document.addEventListener('visibilitychange', trigger)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      document.removeEventListener('visibilitychange', trigger)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [loggedIn, run])

  return { status: loggedIn ? status : 'idle', lastSyncAt, error, syncNow: run }
}

export type SyncState = ReturnType<typeof useSync>

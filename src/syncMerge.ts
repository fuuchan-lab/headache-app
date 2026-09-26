/** 同期の「どちらを採用するか」などの純粋な処理。ブラウザ機能に依存しない */
import type { AppRecord } from './types.ts'

type WithoutSynced<T> = T extends unknown ? Omit<T, 'synced'> : never

/** ドライブ上のファイルに保存する形（synced は端末ごとの状態なので含めない） */
export type RemoteRecord = WithoutSynced<AppRecord>

export const MONTH_FILE_RE = /^records-\d{4}-\d{2}\.json$/

/** 記録の作成時刻 (UTC) から月別ファイルの月を決める。作成時刻は変わらないので、日時を編集してもファイルは移らない */
export function monthOf(r: { createdAt: number }): string {
  return new Date(r.createdAt).toISOString().slice(0, 7)
}

export const monthFileName = (month: string) => `records-${month}.json`
export const photoFileName = (id: string) => `photo-${id}.jpg`
/** 書き出し（Excel・写真・データ）の中の、記録のデータ。ドライブの月別ファイルと同じ形式 */
export const PACKAGE_DATA_FILE = 'headache-data.json'

export function toRemote(r: AppRecord): RemoteRecord {
  const { synced: _synced, ...rest } = r
  return rest
}

export function serializeMonth(records: AppRecord[]): string {
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt)
  return JSON.stringify({ version: 1, records: sorted.map(toRemote) })
}

const TYPES = new Set(['headache', 'medication', 'pressure'])

/** ドライブのファイルを読み込む。壊れた行は捨て、ファイル全体が不正なら例外にする */
export function parseMonthFile(text: string): RemoteRecord[] {
  const data = JSON.parse(text) as { records?: unknown }
  if (!data || !Array.isArray(data.records)) throw new Error('invalid-records-file')
  return data.records.filter((r): r is RemoteRecord => {
    const x = r as Partial<RemoteRecord> | null
    return (
      !!x &&
      typeof x.id === 'string' &&
      typeof x.type === 'string' &&
      TYPES.has(x.type) &&
      typeof x.ts === 'number' &&
      typeof x.createdAt === 'number' &&
      typeof x.updatedAt === 'number'
    )
  })
}

export interface MergeOutcome {
  /** この端末に保存し直す記録。null なら何もしない */
  record: AppRecord | null
  /** ドライブ側の内容を取り込んだか（画面の更新が必要か） */
  fromRemote: boolean
}

/** 端末の記録とドライブの記録のうち、更新時刻が新しい方を採用する */
export function mergeRecord(local: AppRecord | undefined, remote: RemoteRecord): MergeOutcome {
  if (!local || remote.updatedAt > local.updatedAt) {
    return { record: { ...remote, synced: true } as AppRecord, fromRemote: true }
  }
  // ドライブ側が古い（別端末が古い内容で上書きした場合など）。もう一度アップロードして直す
  if (local.updatedAt > remote.updatedAt && local.synced) {
    return { record: { ...local, synced: false }, fromRemote: false }
  }
  return { record: null, fromRemote: false }
}

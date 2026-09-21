export type HeadacheLevel = 0 | 1 | 2 | 3 | 4 | 5

interface BaseRecord {
  id: string
  /** 記録時刻 (epoch ms) */
  ts: number
  /** 記録時点の現在地の気圧 (hPa)。取得できなかった場合は null */
  pressure: number | null
  lat: number | null
  lon: number | null
  /** Googleドライブへ保存済みか */
  synced: boolean
  /** 作成時刻 (epoch ms)。変わらない。ドライブの月別ファイルの振り分けに使う */
  createdAt: number
  /** 最終更新時刻 (epoch ms)。端末間で新しい方を採用するために使う */
  updatedAt: number
  /** 削除済み。他の端末へ削除を伝えるため、記録自体は残す */
  deleted?: boolean
}

export interface HeadacheRecord extends BaseRecord {
  type: 'headache'
  level: HeadacheLevel
  note: string
}

export interface MedicationRecord extends BaseRecord {
  type: 'medication'
  name: string
  /** 服用した錠数（0.5錠など）。錠数の記録機能を入れる前の記録には無い */
  tablets?: number
  note: string
  photoId: string | null
}

/** アプリを開いた時に自動で残す気圧の記録 */
interface PressureRecord extends BaseRecord {
  type: 'pressure'
}

export type AppRecord = HeadacheRecord | MedicationRecord | PressureRecord

export interface PhotoRecord {
  id: string
  blob: Blob
  synced: boolean
}

export const LEVEL_COLORS: Record<HeadacheLevel, string> = {
  0: '#4ade80',
  1: '#a3e635',
  2: '#facc15',
  3: '#fb923c',
  4: '#f87171',
  5: '#dc2626',
}

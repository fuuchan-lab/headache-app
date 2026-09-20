/** 服薬間隔をもとにした、次の服薬までの残り時間の計算。ブラウザ機能に依存しない */
import type { AppRecord, MedicationRecord } from './types.ts'

/**
 * 最後に服薬した記録。薬が2種類以上記録されていても、種類に関わらず、時刻が最も新しい服薬を返す。
 * 配列の並び順には依存しない。削除済みは対象外。服薬の記録がなければ undefined。
 */
export function latestMedication(records: AppRecord[]): MedicationRecord | undefined {
  let latest: MedicationRecord | undefined
  for (const r of records) {
    if (r.type === 'medication' && !r.deleted && (latest === undefined || r.ts > latest.ts)) latest = r
  }
  return latest
}

const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000

/**
 * 次の服薬が可能になるまでの残り時間 (ms)。服薬間隔を決めていない薬は null。
 * 間隔が過ぎていれば 0。分単位で表示するため、1分に満たない端数は切り上げる（「あと0分」を出さない）。
 */
export function remainingUntilNextDose(lastTakenAt: number, intervalHours: number | undefined, now: number): number | null {
  if (intervalHours === undefined || !(intervalHours > 0)) return null
  const remaining = lastTakenAt + intervalHours * HOUR_MS - now
  if (remaining <= 0) return 0
  return Math.ceil(remaining / MINUTE_MS) * MINUTE_MS
}

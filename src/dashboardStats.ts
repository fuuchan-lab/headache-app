import type { AppRecord, HeadacheLevel } from './types.ts'

const DAY_MS = 24 * 60 * 60 * 1000

export interface DashboardStats {
  /** 頭痛の記録の件数 */
  headaches: number
  /** 直近7日・30日の頭痛の件数 */
  last7: number
  last30: number
  /** 服薬の記録の件数 */
  medications: number
  /** 頭痛か服薬を記録した日数 */
  days: number
  /** 記録期間（最初と最後の記録時刻）。記録が無ければ null */
  range: { from: number; to: number } | null
  /** 痛みの強さ（0〜5）ごとの件数 */
  byLevel: Record<HeadacheLevel, number>
  /** 月（YYYY-MM）ごとの頭痛の件数。古い順 */
  byMonth: { month: string; count: number }[]
  /** 薬の名前ごとの服薬回数。多い順 */
  byMedicine: { name: string; count: number }[]
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 頭痛・服薬の記録から、ダッシュボードに出す集計を作る（気圧だけの自動記録は数えない） */
export function computeStats(records: AppRecord[], now: number): DashboardStats {
  const stats: DashboardStats = {
    headaches: 0,
    last7: 0,
    last30: 0,
    medications: 0,
    days: 0,
    range: null,
    byLevel: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    byMonth: [],
    byMedicine: [],
  }
  const days = new Set<string>()
  const months = new Map<string, number>()
  const meds = new Map<string, number>()
  for (const r of records) {
    if (r.type === 'pressure') continue
    days.add(dayKey(r.ts))
    stats.range = stats.range
      ? { from: Math.min(stats.range.from, r.ts), to: Math.max(stats.range.to, r.ts) }
      : { from: r.ts, to: r.ts }
    if (r.type === 'headache') {
      stats.headaches += 1
      stats.byLevel[r.level] += 1
      if (now - r.ts <= 7 * DAY_MS) stats.last7 += 1
      if (now - r.ts <= 30 * DAY_MS) stats.last30 += 1
      const month = dayKey(r.ts).slice(0, 7)
      months.set(month, (months.get(month) ?? 0) + 1)
    } else {
      stats.medications += 1
      meds.set(r.name, (meds.get(r.name) ?? 0) + 1)
    }
  }
  stats.days = days.size
  stats.byMonth = [...months].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month))
  stats.byMedicine = [...meds].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  return stats
}

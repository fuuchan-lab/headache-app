import type { PressureForecast } from './weather.ts'

export type Arrow = 'up' | 'down' | 'flat'

export interface AheadPoint {
  hours: number
  hpa: number
  /** 現在の気圧との差 (hPa) */
  diff: number
  arrow: Arrow
  code: number
  isDay: boolean
}

const HOUR = 3_600_000

/** これ未満の変化は「横ばい」として斜めの矢印を出さない (hPa) */
const FLAT_THRESHOLD = 1

export function arrowFor(diff: number): Arrow {
  if (diff >= FLAT_THRESHOLD) return 'up'
  if (diff <= -FLAT_THRESHOLD) return 'down'
  return 'flat'
}

/** 今から N 時間後に最も近い予報を、現在の気圧との差つきで返す */
export function aheadPoints(f: PressureForecast, now: number, hoursList = [3, 6, 12]): AheadPoint[] {
  return hoursList.flatMap((hours): AheadPoint[] => {
    const target = now + hours * HOUR
    const future = f.series.filter((p) => p.t > now)
    if (future.length === 0) return []
    const p = future.reduce((best, cur) => (Math.abs(cur.t - target) < Math.abs(best.t - target) ? cur : best))
    // 予報の範囲より先の時間は出さない
    if (Math.abs(p.t - target) > HOUR) return []
    const diff = p.hpa - f.current
    return [{ hours, hpa: p.hpa, diff, arrow: arrowFor(diff), code: p.code, isDay: p.isDay }]
  })
}

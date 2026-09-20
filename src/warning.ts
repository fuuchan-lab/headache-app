import type { PressureForecast } from './weather.ts'

export type WarningLevel = 'none' | 'caution' | 'warning'

export interface TrendAssessment {
  level: WarningLevel
  message: string
}

const HOUR = 3_600_000

// 現在値からの低下量 (hPa) のしきい値
const CAUTION_3H = 2
const WARNING_3H = 4
const CAUTION_6H = 3
const WARNING_6H = 6

/** 予報の範囲内 (now, now+hours] での最低気圧を返す */
function minAhead(f: PressureForecast, now: number, hours: number): number | null {
  const pts = f.series.filter((p) => p.t > now && p.t <= now + hours * HOUR)
  return pts.length ? Math.min(...pts.map((p) => p.hpa)) : null
}

/** 気圧が下がりつつあるかを判定する */
export function assessTrend(f: PressureForecast, now = Date.now()): TrendAssessment {
  const drop3 = f.current - (minAhead(f, now, 3) ?? f.current)
  const drop6 = f.current - (minAhead(f, now, 6) ?? f.current)

  if (drop3 >= WARNING_3H || drop6 >= WARNING_6H) {
    return {
      level: 'warning',
      message: `気圧が急に下がる見込みです（3時間で約${drop3.toFixed(1)}hPa、6時間で約${drop6.toFixed(1)}hPa低下）。早めの対策を。`,
    }
  }
  if (drop3 >= CAUTION_3H || drop6 >= CAUTION_6H) {
    return {
      level: 'caution',
      message: `気圧が下がりつつあります（3時間で約${drop3.toFixed(1)}hPa、6時間で約${drop6.toFixed(1)}hPa低下の見込み）。`,
    }
  }

  const ago3 = f.series.filter((p) => p.t <= now - 3 * HOUR).at(-1)
  if (ago3 && ago3.hpa - f.current >= CAUTION_3H) {
    return {
      level: 'caution',
      message: `ここ3時間で気圧が約${(ago3.hpa - f.current).toFixed(1)}hPa下がっています。`,
    }
  }
  return { level: 'none', message: '気圧は安定しています。' }
}

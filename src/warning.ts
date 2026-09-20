import type { TFn } from './i18n/context.ts'
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

/** 気圧が下がりつつあるかを判定し、表示する言語のメッセージにして返す */
export function assessTrend(f: PressureForecast, t: TFn, now: number): TrendAssessment {
  const drop3 = f.current - (minAhead(f, now, 3) ?? f.current)
  const drop6 = f.current - (minAhead(f, now, 6) ?? f.current)
  const vars = { d3: drop3.toFixed(1), d6: drop6.toFixed(1) }

  if (drop3 >= WARNING_3H || drop6 >= WARNING_6H) {
    return { level: 'warning', message: t('trend.warning', vars) }
  }
  if (drop3 >= CAUTION_3H || drop6 >= CAUTION_6H) {
    return { level: 'caution', message: t('trend.caution', vars) }
  }

  const ago3 = f.series.filter((p) => p.t <= now - 3 * HOUR).at(-1)
  if (ago3 && ago3.hpa - f.current >= CAUTION_3H) {
    return { level: 'caution', message: t('trend.past', { d: (ago3.hpa - f.current).toFixed(1) }) }
  }
  return { level: 'none', message: t('trend.stable') }
}

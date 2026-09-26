/** 1時間ごとの気圧の1点。気圧が取れていない時刻は hpa が null */
export interface HourlyPoint {
  /** epoch ms */
  t: number
  hpa: number | null
}

/** 記録の日時がこれ以内なら「いま」とみなして、取得済みの現在の気圧を付ける */
export const NEAR_NOW_MS = 5 * 60_000

/** 過去の気圧を調べられなかった時に、いまの気圧で代わりにしてよい範囲 */
export const SUBSTITUTE_MS = 60 * 60_000

/** 前後どちらか片方の時刻しか無い時に、その値を使ってよい最大の距離 */
const MAX_GAP_MS = 90 * 60_000

/** 前後の時刻の間が空きすぎている（欠測が続いている）時は、間の値を推測しない */
const MAX_SPAN_MS = 3 * 60 * 60_000

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * 1時間ごとの気圧から、指定した日時の気圧を求める。
 * 前後の時刻の値があれば直線で補間し、片方しか無い時は近い方（90分以内）を使う。求められなければ null。
 */
export function interpolatePressure(points: HourlyPoint[], ts: number): number | null {
  let before: { t: number; hpa: number } | null = null
  let after: { t: number; hpa: number } | null = null
  for (const p of points) {
    if (p.hpa === null || !Number.isFinite(p.hpa)) continue
    const point = { t: p.t, hpa: p.hpa }
    if (point.t <= ts && (before === null || point.t > before.t)) before = point
    if (point.t >= ts && (after === null || point.t < after.t)) after = point
  }

  if (before && after) {
    if (before.t === after.t) return round1(before.hpa)
    if (after.t - before.t <= MAX_SPAN_MS) {
      const ratio = (ts - before.t) / (after.t - before.t)
      return round1(before.hpa + (after.hpa - before.hpa) * ratio)
    }
  }

  const nearest =
    before && after ? (ts - before.t <= after.t - ts ? before : after) : (before ?? after)
  return nearest && Math.abs(nearest.t - ts) <= MAX_GAP_MS ? round1(nearest.hpa) : null
}

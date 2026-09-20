/** グラフの横軸（時間）の表示範囲の計算。ブラウザ機能に依存しない */

export interface TimeWindow {
  from: number
  to: number
}

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

/** 最大まで拡大した時の表示幅 */
export const MIN_SPAN = HOUR
/** 記録が1〜2件しかなくても、この幅は確保する（幅が0になって描けなくなるのを防ぐ） */
const MIN_AUTO_SPAN = 6 * HOUR
/** 自動範囲の両端に付ける余白（範囲全体に対する割合）。端の記録が軸に重ならないようにする */
const AUTO_PAD = 0.04

const span = (w: TimeWindow) => w.to - w.from

/** 記録の時刻すべてが収まる範囲。記録の量が増えれば自然に広がる */
export function autoWindow(times: number[]): TimeWindow {
  if (times.length === 0) return { from: 0, to: DAY }
  const min = Math.min(...times)
  const max = Math.max(...times)
  if (max - min < MIN_AUTO_SPAN) {
    const mid = (min + max) / 2
    return { from: mid - MIN_AUTO_SPAN / 2, to: mid + MIN_AUTO_SPAN / 2 }
  }
  const pad = (max - min) * AUTO_PAD
  return { from: min - pad, to: max + pad }
}

/** 表示範囲が、自動範囲（記録の全体）とほぼ同じか、それより広いか */
export function coversAll(w: TimeWindow, auto: TimeWindow): boolean {
  return span(w) >= span(auto) * 0.999
}

/** 表示範囲を limits の中に収める。limits より広ければ limits そのものにする */
export function clampWindow(w: TimeWindow, limits: TimeWindow): TimeWindow {
  if (span(w) >= span(limits)) return { ...limits }
  if (w.from < limits.from) return { from: limits.from, to: limits.from + span(w) }
  if (w.to > limits.to) return { from: limits.to - span(w), to: limits.to }
  return w
}

/**
 * 拡大・縮小する。factor が 1 より大きければ拡大（幅が狭くなる）、小さければ縮小。
 * anchorRatio (0〜1) の位置にある時刻は動かさない（ピンチした指の位置が動かないように）。
 */
export function zoomWindow(w: TimeWindow, factor: number, anchorRatio: number, limits: TimeWindow): TimeWindow {
  const maxSpan = Math.max(span(limits), MIN_SPAN)
  const newSpan = Math.min(Math.max(span(w) / factor, MIN_SPAN), maxSpan)
  const anchorTime = w.from + span(w) * anchorRatio
  const from = anchorTime - newSpan * anchorRatio
  return clampWindow({ from, to: from + newSpan }, limits)
}

/** 時間の向きにずらす（正なら未来へ）。記録のない範囲までは動かさない */
export function panWindow(w: TimeWindow, deltaMs: number, limits: TimeWindow): TimeWindow {
  return clampWindow({ from: w.from + deltaMs, to: w.to + deltaMs }, limits)
}

export interface Ticks {
  values: number[]
  /** 目盛りの単位。hour は時刻、day は日付を表示する */
  unit: 'hour' | 'day'
}

const HOUR_STEPS = [1, 2, 3, 6, 12]
const DAY_STEPS = [1, 2, 3, 7, 14, 30, 60, 90, 180, 365]

function hourTicks(w: TimeWindow, stepHours: number): number[] {
  const d = new Date(w.from)
  d.setMinutes(0, 0, 0)
  // 目盛りは、ステップの倍数の時刻（例: 6時間ごとなら 0, 6, 12, 18 時）に置く
  while (d.getTime() < w.from || d.getHours() % stepHours !== 0) d.setHours(d.getHours() + 1)
  const ticks: number[] = []
  while (d.getTime() <= w.to) {
    ticks.push(d.getTime())
    d.setHours(d.getHours() + stepHours)
  }
  return ticks
}

function dayTicks(w: TimeWindow, stepDays: number): number[] {
  const d = new Date(w.from)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() < w.from) d.setDate(d.getDate() + 1)
  const ticks: number[] = []
  while (d.getTime() <= w.to) {
    ticks.push(d.getTime())
    d.setDate(d.getDate() + stepDays)
  }
  return ticks
}

/**
 * 表示範囲に合った目盛りを選ぶ。2日以内なら時刻、それより長ければ日付（長い期間は間引く）。
 * どの幅でも、目盛りが maxTicks 個程度に収まる。
 */
export function chooseTicks(w: TimeWindow, maxTicks = 6): Ticks {
  const s = span(w)
  if (s <= 2 * DAY) {
    const step = HOUR_STEPS.find((h) => s / (h * HOUR) <= maxTicks) ?? HOUR_STEPS[HOUR_STEPS.length - 1]
    return { values: hourTicks(w, step), unit: 'hour' }
  }
  const step = DAY_STEPS.find((d) => s / (d * DAY) <= maxTicks) ?? DAY_STEPS[DAY_STEPS.length - 1]
  return { values: dayTicks(w, step), unit: 'day' }
}

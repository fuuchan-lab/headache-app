import { OUTLOOK_HOURS } from './forecast.ts'
import type { Position } from './geo.ts'
import type { PressureForecast } from './weather.ts'

/**
 * 最後に取得した気圧・予報を端末に残す。電波がない時に開いても、気圧カードと記録グラフの予報（点線）を表示できるようにする。
 * 予報の終わり（取得から3日後）を過ぎたものは、もう見せる意味がないので使わない。
 */
const STORAGE_KEY = 'lastForecast'
const HOUR = 3_600_000
export const CACHE_MAX_AGE_MS = OUTLOOK_HOURS * HOUR

export interface CachedForecast {
  forecast: PressureForecast
  position: Position
  /** 取得した時刻 (epoch ms) */
  fetchedAt: number
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** 保存した文字列を読み戻す。形が違う・古すぎる時は null */
export function parseCachedForecast(raw: string | null, now: number): CachedForecast | null {
  if (!raw) return null
  try {
    const c = JSON.parse(raw) as Partial<CachedForecast>
    const f = c.forecast
    if (!isNum(c.fetchedAt) || !c.position || !isNum(c.position.lat) || !isNum(c.position.lon)) return null
    if (!f || !isNum(f.current) || !f.weather || !Array.isArray(f.series) || !Array.isArray(f.fine)) return null
    if (now - c.fetchedAt > CACHE_MAX_AGE_MS || c.fetchedAt - now > HOUR) return null
    return { forecast: f, position: c.position, fetchedAt: c.fetchedAt }
  } catch {
    return null
  }
}

export function loadCachedForecast(now = Date.now()): CachedForecast | null {
  try {
    return parseCachedForecast(localStorage.getItem(STORAGE_KEY), now)
  } catch {
    return null
  }
}

export function saveCachedForecast(c: CachedForecast): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  } catch {
    // 保存できなくても、オンラインでの動作には影響しない
  }
}

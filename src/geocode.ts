import type { Lang } from './i18n/context.ts'
import { formatPlace, type PlaceAddress } from './placeName.ts'

const CACHE_KEY = 'headache-place-cache'
const CACHE_LIMIT = 30
const TIMEOUT_MS = 8000

function loadCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function saveCache(cache: Record<string, string>) {
  // 古いものから捨てて、保存する件数を抑える
  const keys = Object.keys(cache)
  const trimmed = keys.length > CACHE_LIMIT ? Object.fromEntries(keys.slice(-CACHE_LIMIT).map((k) => [k, cache[k]])) : cache
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
  } catch {
    // 保存できなければ、次回また問い合わせるだけ
  }
}

/** 緯度経度を約1km単位に丸めたキー。近くにいる間は同じ地名を使い回して、問い合わせを減らす */
export function placeCacheKey(lat: number, lon: number, lang: Lang): string {
  return `${lang}:${lat.toFixed(2)},${lon.toFixed(2)}`
}

/**
 * 緯度経度から、都道府県・市区町村名を取得する（OpenStreetMap Nominatim。キー不要）。
 * 失敗しても気圧の表示には影響させないため、取得できなければ null を返す。
 */
export async function fetchPlaceName(lat: number, lon: number, lang: Lang): Promise<string | null> {
  const key = placeCacheKey(lat, lon, lang)
  const cached = loadCache()[key]
  if (cached) return cached

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: lat.toFixed(4),
      lon: lon.toFixed(4),
      zoom: '10', // 市区町村の単位
      addressdetails: '1',
      'accept-language': lang,
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { signal: controller.signal })
    if (!res.ok) return null
    const data = (await res.json()) as { address?: PlaceAddress }
    const name = data.address ? formatPlace(data.address, lang) : null
    if (name) saveCache({ ...loadCache(), [key]: name })
    return name
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

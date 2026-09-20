/** 逆ジオコーディング (OpenStreetMap Nominatim) の住所から、表示する地名を作る。ブラウザ機能に依存しない */
import type { Lang } from './i18n/context.ts'

export interface PlaceAddress {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  /** 日本では都道府県 */
  province?: string
  state?: string
  'ISO3166-2-lvl4'?: string
}

/** OpenStreetMap の住所に都道府県が入らない地域の補正（東京都は province が空になる） */
const REGION_FALLBACK: Record<string, Record<Lang, string>> = {
  'JP-13': { ja: '東京都', en: 'Tokyo' },
}

/**
 * 日本語なら「神奈川県横浜市」、英語なら「Yokohama, Kanagawa Prefecture」の形にする。
 * 都道府県と市区町村のどちらかしか分からなければ、分かる方だけ。どちらもなければ null。
 */
export function formatPlace(a: PlaceAddress, lang: Lang): string | null {
  const region = a.province ?? a.state ?? REGION_FALLBACK[a['ISO3166-2-lvl4'] ?? '']?.[lang]
  const place = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county
  // 東京23区の「東京都」など、両方が同じ名前の時は1つにする
  const parts = [region, place].filter((p): p is string => !!p)
  const unique = parts.filter((p, i) => parts.indexOf(p) === i)
  if (unique.length === 0) return null
  return lang === 'ja' ? unique.join('') : [...unique].reverse().join(', ')
}

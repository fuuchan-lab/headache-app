import { useEffect, useState } from 'react'
import type { Position } from '../geo.ts'
import { fetchPlaceName, placeCacheKey } from '../geocode.ts'
import type { Lang } from '../i18n/context.ts'

/** 気圧を取得している位置の、都道府県・市区町村名。取得できるまで（または取得できなければ）null */
export function usePlaceName(position: Position | null, lang: Lang): string | null {
  const [result, setResult] = useState<{ key: string; name: string | null } | null>(null)
  const lat = position?.lat
  const lon = position?.lon
  const key = lat !== undefined && lon !== undefined ? placeCacheKey(lat, lon, lang) : null

  useEffect(() => {
    if (key === null || lat === undefined || lon === undefined) return
    let cancelled = false
    void fetchPlaceName(lat, lon, lang).then((name) => {
      if (!cancelled) setResult({ key, name })
    })
    return () => {
      cancelled = true
    }
  }, [key, lat, lon, lang])

  // 位置や言語が変わった直後に、前の場所の名前を出さない
  return result !== null && result.key === key ? result.name : null
}

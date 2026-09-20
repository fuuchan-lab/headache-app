export interface Position {
  lat: number
  lon: number
}

const STORAGE_KEY = 'lastPosition'

function loadLastPosition(): Position | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Position) : null
  } catch {
    return null
  }
}

/**
 * 現在地を取得する。取得できない場合は前回の位置を使う。
 * どちらもなければ例外を投げる。
 */
export async function getPosition(): Promise<{ pos: Position; fresh: boolean }> {
  try {
    const pos = await new Promise<Position>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        reject,
        { timeout: 10_000, maximumAge: 10 * 60_000 },
      )
    })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
    } catch {
      // 保存できなくても動作には影響しない
    }
    return { pos, fresh: true }
  } catch (e) {
    const last = loadLastPosition()
    if (last) return { pos: last, fresh: false }
    throw e
  }
}

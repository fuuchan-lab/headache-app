/** 不快指数と、その値に応じた色。ブラウザ機能に依存しない */

/** 不快指数の区分 (0〜7)。値が大きいほど暑くて不快 */
export type DiCategory = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** 不快指数 = 0.81×気温 + 0.01×湿度×(0.99×気温 − 14.3) + 46.3 （気温は℃、湿度は%） */
export function discomfortIndex(tempC: number, humidity: number): number {
  return 0.81 * tempC + 0.01 * humidity * (0.99 * tempC - 14.3) + 46.3
}

// 区分の境目（一般に使われる目安）:
// 55未満 寒い / 55〜60 肌寒い / 60〜65 何も感じない / 65〜70 快い / 70〜75 暑くない /
// 75〜80 やや暑い / 80〜85 暑くて汗が出る / 85以上 暑くてたまらない
const BOUNDS = [55, 60, 65, 70, 75, 80, 85]

export function discomfortCategory(di: number): DiCategory {
  const index = BOUNDS.filter((b) => di >= b).length
  return index as DiCategory
}

/**
 * 色の基準点: [不快指数, 色相, 彩度%, 明度%]（各区分の真ん中の値に置く）。
 * 一般的な不快指数の色分け（青 → 水色 → ミント → 緑 → 黄緑 → 黄 → オレンジ → 赤）に沿っている。
 * 白い文字が読めるよう、どの色も明度を低く（濃く）してある。
 */
const STOPS: readonly (readonly [number, number, number, number])[] = [
  [50, 212, 85, 38], // 寒い: 青
  [57.5, 200, 85, 32], // 肌寒い: 水色
  [62.5, 165, 80, 25], // 何も感じない: ミント（青緑）
  [67.5, 125, 60, 27], // 快い: 緑
  [72.5, 75, 65, 25], // 暑くない: 黄緑
  [77.5, 45, 90, 25], // やや暑い: 黄（明るく見えやすいので特に濃く）
  [82.5, 25, 90, 33], // 暑くて汗が出る: オレンジ
  [87.5, -4, 78, 34], // 暑くてたまらない: 赤（色相 356°）
]

/** 不快指数に応じた背景色 (CSS の hsl 値)。基準点の間はなめらかに変わる */
export function discomfortColor(di: number): string {
  const first = STOPS[0]
  const last = STOPS[STOPS.length - 1]
  let h: number, s: number, l: number
  if (di <= first[0]) {
    ;[, h, s, l] = first
  } else if (di >= last[0]) {
    ;[, h, s, l] = last
  } else {
    const i = STOPS.findIndex((stop, idx) => di >= stop[0] && di < STOPS[idx + 1][0])
    const [d0, h0, s0, l0] = STOPS[i]
    const [d1, h1, s1, l1] = STOPS[i + 1]
    const k = (di - d0) / (d1 - d0)
    h = h0 + (h1 - h0) * k
    s = s0 + (s1 - s0) * k
    l = l0 + (l1 - l0) * k
  }
  const hue = ((h % 360) + 360) % 360
  return `hsl(${hue.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)`
}

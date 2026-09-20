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
 * 不快さを 0（快適）〜1（不快）にする。
 * 60〜65 は「何も感じない」快適な範囲。暑い側は 85 で最大、寒い側は 48 で最大とする。
 */
export function discomfortScale(di: number): number {
  if (di >= 65) return Math.min(1, (di - 65) / 20)
  if (di < 60) return Math.min(1, (60 - di) / 12)
  return 0
}

// 色の3点（HSL）。快適 = 濃い青、普通 = 濃い紫、不快 = 濃い赤。白い文字が読める濃さにしている
const BLUE = [222, 72, 30] as const
const PURPLE = [272, 58, 32] as const
const RED = [356, 74, 32] as const

const mix = (a: readonly number[], b: readonly number[], k: number) => a.map((v, i) => v + (b[i] - v) * k)

/** 不快指数に応じた背景色 (CSS の hsl 値)。青 → 紫 → 赤へなめらかに変わる */
export function discomfortColor(di: number): string {
  const s = discomfortScale(di)
  const [h, sat, light] = s <= 0.5 ? mix(BLUE, PURPLE, s / 0.5) : mix(PURPLE, RED, (s - 0.5) / 0.5)
  return `hsl(${h.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`
}

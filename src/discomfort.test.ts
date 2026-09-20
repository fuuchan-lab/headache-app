import assert from 'node:assert/strict'
import { test } from 'node:test'
import { discomfortCategory, discomfortColor, discomfortIndex } from './discomfort.ts'

/** "hsl(212 85% 38%)" → [r, g, b] (0〜1) */
function hslToRgb(css: string): [number, number, number] {
  const m = css.match(/hsl\((\d+) (\d+)% (\d+)%\)/)
  if (!m) throw new Error('unexpected color: ' + css)
  const h = Number(m[1])
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

/** WCAG の相対輝度から、白い文字とのコントラスト比を求める */
function contrastWithWhite(css: string): number {
  const [r, g, b] = hslToRgb(css).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return 1.05 / (luminance + 0.05)
}

const hue = (css: string) => Number(css.match(/hsl\((\d+)/)?.[1])

test('不快指数の計算（気温23℃・湿度96% ≒ 73）', () => {
  assert.ok(Math.abs(discomfortIndex(23, 96) - 73.06) < 0.01)
  // 気温25℃・湿度60% → 0.81*25 + 0.6*(24.75-14.3) + 46.3 = 72.82
  assert.ok(Math.abs(discomfortIndex(25, 60) - 72.82) < 0.01)
  // 気温30℃・湿度80% → 24.3 + 0.8*(29.7-14.3) + 46.3 = 82.92
  assert.ok(Math.abs(discomfortIndex(30, 80) - 82.92) < 0.01)
})

test('区分は境目の値から次の区分になる', () => {
  assert.equal(discomfortCategory(54.9), 0)
  assert.equal(discomfortCategory(55), 1)
  assert.equal(discomfortCategory(62), 2)
  assert.equal(discomfortCategory(65), 3)
  assert.equal(discomfortCategory(72), 4)
  assert.equal(discomfortCategory(75), 5)
  assert.equal(discomfortCategory(80), 6)
  assert.equal(discomfortCategory(85), 7)
  assert.equal(discomfortCategory(95), 7)
})

test('各区分の真ん中では、青・水色・ミント・緑・黄緑・黄・オレンジ・赤の色になる', () => {
  const hues = [50, 57.5, 62.5, 67.5, 72.5, 77.5, 82.5, 87.5].map((di) => hue(discomfortColor(di)))
  assert.deepEqual(hues, [212, 200, 165, 125, 75, 45, 25, 356])
})

test('範囲の外側は、両端の色のまま', () => {
  assert.equal(discomfortColor(30), discomfortColor(50))
  assert.equal(discomfortColor(110), discomfortColor(87.5))
})

test('色は連続的に変わる（隣り合う値で色相が大きく飛ばない）', () => {
  let prev = hue(discomfortColor(48))
  for (let di = 48.5; di <= 90; di += 0.5) {
    const h = hue(discomfortColor(di))
    // 赤(356)→オレンジ(25)の折り返しは 360 を挟んで近いので、円周上の差で比べる
    const diff = Math.min(Math.abs(h - prev), 360 - Math.abs(h - prev))
    assert.ok(diff <= 12, `di=${di}: 色相が ${prev} → ${h} と急に変わっている`)
    prev = h
  }
})

test('全範囲で白い文字とのコントラスト比が 4.5:1 以上（読みやすい濃さ）', () => {
  for (let di = 40; di <= 100; di += 0.5) {
    const color = discomfortColor(di)
    assert.ok(contrastWithWhite(color) >= 4.5, `di=${di} ${color}: コントラスト ${contrastWithWhite(color).toFixed(2)}`)
  }
})

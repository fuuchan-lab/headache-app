import assert from 'node:assert/strict'
import { test } from 'node:test'
import { discomfortCategory, discomfortColor, discomfortIndex, discomfortScale } from './discomfort.ts'

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

test('不快さは快適な範囲(60〜65)で0、暑い側は85で1、寒い側は48で1', () => {
  assert.equal(discomfortScale(62), 0)
  assert.equal(discomfortScale(65), 0)
  assert.equal(discomfortScale(75), 0.5)
  assert.equal(discomfortScale(85), 1)
  assert.equal(discomfortScale(100), 1)
  assert.equal(discomfortScale(60), 0)
  assert.equal(discomfortScale(54), 0.5)
  assert.equal(discomfortScale(30), 1)
})

test('色は快適なら濃い青、普通(不快指数75)なら濃い紫、不快(85以上)なら濃い赤', () => {
  assert.equal(discomfortColor(62), 'hsl(222 72% 30%)')
  assert.equal(discomfortColor(75), 'hsl(272 58% 32%)')
  assert.equal(discomfortColor(85), 'hsl(356 74% 32%)')
  assert.equal(discomfortColor(120), 'hsl(356 74% 32%)')
})

test('色は不快指数が上がるにつれて色相が青(222)→紫(272)→赤(356)へ順に変わる', () => {
  const hue = (di: number) => Number(discomfortColor(di).match(/hsl\((\d+)/)?.[1])
  const hues = [65, 68, 71, 75, 78, 81, 85].map(hue)
  assert.deepEqual(
    hues,
    [...hues].sort((a, b) => a - b),
  )
  assert.ok(hues[0] < 240 && hues[3] > 260 && hues[3] < 285 && hues[6] > 340)
})

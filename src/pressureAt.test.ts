import assert from 'node:assert/strict'
import { test } from 'node:test'
import { interpolatePressure, type HourlyPoint } from './pressureAt.ts'

const H = 3_600_000
const at = (hours: number) => hours * H
const pts = (...hpas: (number | null)[]): HourlyPoint[] => hpas.map((hpa, i) => ({ t: at(i), hpa }))

test('ちょうど1時間ごとの時刻なら、その値を返す', () => {
  assert.equal(interpolatePressure(pts(1000, 1010, 1020), at(1)), 1010)
})

test('前後の時刻の間は直線で補間し、小数第1位に丸める', () => {
  assert.equal(interpolatePressure(pts(1000, 1010), at(0.5)), 1005)
  assert.equal(interpolatePressure(pts(1000, 1010), at(0.25)), 1002.5)
  assert.equal(interpolatePressure(pts(1000, 1001), at(1 / 3)), 1000.3)
})

test('片方の時刻が欠測なら、90分以内の近い方の値を使う', () => {
  assert.equal(interpolatePressure(pts(1000, null), at(0.4)), 1000)
  assert.equal(interpolatePressure(pts(null, 1010), at(0.6)), 1010)
})

test('片方しか無くて90分より離れている時は null', () => {
  assert.equal(interpolatePressure(pts(1000), at(2)), null)
})

test('欠測が3時間より長く続く間は、推測せずに近い方だけを使う', () => {
  const points = pts(1000, null, null, null, 1040)
  assert.equal(interpolatePressure(points, at(1)), 1000)
  assert.equal(interpolatePressure(points, at(2)), null)
  assert.equal(interpolatePressure(points, at(3)), 1040)
})

test('データが空、または全部欠測なら null', () => {
  assert.equal(interpolatePressure([], at(1)), null)
  assert.equal(interpolatePressure(pts(null, null), at(0.5)), null)
})

test('並び順が崩れていても求められる', () => {
  const shuffled: HourlyPoint[] = [
    { t: at(2), hpa: 1020 },
    { t: at(0), hpa: 1000 },
    { t: at(1), hpa: 1010 },
  ]
  assert.equal(interpolatePressure(shuffled, at(1.5)), 1015)
})

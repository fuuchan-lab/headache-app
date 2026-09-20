import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DAY, HOUR, MIN_SPAN, autoWindow, chooseTicks, clampWindow, coversAll, panWindow, zoomWindow } from './chartView.ts'

const at = (d: number, h = 0) => new Date(2026, 8, d, h).getTime()

test('autoWindow は記録の全体が収まる範囲を、少し余白を付けて返す', () => {
  const w = autoWindow([at(10), at(12), at(20)])
  assert.ok(w.from < at(10) && w.to > at(20))
  // 余白は範囲の4%程度
  assert.ok(Math.abs(at(10) - w.from - (at(20) - at(10)) * 0.04) < 1000)
})

test('記録の量が増えて期間が延びると、範囲も広がる', () => {
  const few = autoWindow([at(19), at(20)])
  const many = autoWindow([at(1), at(20)])
  assert.ok(many.to - many.from > few.to - few.from)
})

test('記録が1件だけでも、幅は確保される（6時間）', () => {
  const w = autoWindow([at(20, 12)])
  assert.equal(w.to - w.from, 6 * HOUR)
  assert.equal((w.from + w.to) / 2, at(20, 12))
})

test('記録がなくても壊れない', () => {
  assert.deepEqual(autoWindow([]), { from: 0, to: DAY })
})

test('zoomWindow は指を置いた位置の時刻を動かさずに拡大する', () => {
  const limits = { from: at(1), to: at(11) }
  const w = { from: at(1), to: at(11) }
  const anchor = 0.25
  const before = w.from + (w.to - w.from) * anchor
  const z = zoomWindow(w, 2, anchor, limits)
  assert.equal(z.to - z.from, (w.to - w.from) / 2)
  assert.ok(Math.abs(z.from + (z.to - z.from) * anchor - before) < 1)
})

test('zoomWindow は最小の幅より狭くならず、全体より広くもならない', () => {
  const limits = { from: at(1), to: at(11) }
  const zoomedIn = zoomWindow({ from: at(5), to: at(5) + 2 * HOUR }, 1000, 0.5, limits)
  assert.equal(zoomedIn.to - zoomedIn.from, MIN_SPAN)
  const out = zoomWindow({ from: at(3), to: at(5) }, 0.001, 0.5, limits)
  assert.deepEqual(out, limits)
})

test('panWindow は記録のある範囲の外へは動かさない', () => {
  const limits = { from: at(1), to: at(11) }
  const w = { from: at(3), to: at(5) }
  assert.deepEqual(panWindow(w, 1 * DAY, limits), { from: at(4), to: at(6) })
  assert.deepEqual(panWindow(w, -100 * DAY, limits), { from: at(1), to: at(3) })
  assert.deepEqual(panWindow(w, 100 * DAY, limits), { from: at(9), to: at(11) })
})

test('clampWindow / coversAll: 全体より広い範囲は全体として扱う', () => {
  const limits = { from: at(1), to: at(11) }
  assert.deepEqual(clampWindow({ from: at(0), to: at(20) }, limits), limits)
  assert.equal(coversAll(limits, limits), true)
  assert.equal(coversAll({ from: at(2), to: at(11) }, limits), false)
})

test('chooseTicks: 6時間なら1時間ごと、1日なら6時間ごと、時刻の目盛り', () => {
  const six = chooseTicks({ from: at(20, 9), to: at(20, 15) })
  assert.equal(six.unit, 'hour')
  assert.equal(six.values.length, 7)
  const day = chooseTicks({ from: at(20, 0), to: at(21, 0) })
  assert.equal(day.unit, 'hour')
  assert.ok(day.values.every((t) => new Date(t).getHours() % 6 === 0))
})

test('chooseTicks: 3日以上は日付の目盛りで、0時の位置に置く', () => {
  const three = chooseTicks({ from: at(18, 10), to: at(21, 10) })
  assert.equal(three.unit, 'day')
  assert.ok(three.values.every((t) => new Date(t).getHours() === 0))
  assert.equal(three.values.length, 3)
})

test('chooseTicks: どの期間でも目盛りは8個以内に収まる', () => {
  for (const days of [0.05, 0.5, 1, 2, 3, 7, 14, 30, 90, 180, 365, 1000]) {
    const t = chooseTicks({ from: at(1), to: at(1) + days * DAY })
    assert.ok(t.values.length <= 8, `${days}日: 目盛りが ${t.values.length} 個`)
    assert.ok(t.values.length >= 1, `${days}日: 目盛りがない`)
  }
})

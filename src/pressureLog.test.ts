import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PRESSURE_LOG_MIN_GAP_MS, shouldLogPressure } from './pressureLog.ts'

test('まだ記録がなければ残す', () => {
  assert.equal(shouldLogPressure(null, 1_000_000), true)
})

test('開くたびに残す。5分以内に開き直した時も残す', () => {
  const last = 1_000_000
  assert.equal(shouldLogPressure(last, last + 60_000), true)
  assert.equal(shouldLogPressure(last, last + 4 * 60_000), true)
})

test('同じ瞬間の二重記録（10秒未満）だけ防ぐ', () => {
  const last = 1_000_000
  assert.equal(shouldLogPressure(last, last), false)
  assert.equal(shouldLogPressure(last, last + PRESSURE_LOG_MIN_GAP_MS - 1), false)
  assert.equal(shouldLogPressure(last, last + PRESSURE_LOG_MIN_GAP_MS), true)
})

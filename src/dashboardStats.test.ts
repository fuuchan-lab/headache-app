import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeStats } from './dashboardStats.ts'
import type { AppRecord } from './types.ts'

const base = { pressure: null, lat: null, lon: null, synced: true, createdAt: 0, updatedAt: 0 }
const DAY = 24 * 60 * 60 * 1000
const NOW = new Date(2026, 5, 15, 12).getTime()

const records: AppRecord[] = [
  { ...base, id: 'a', type: 'headache', ts: NOW - 1 * DAY, level: 3, note: '' },
  { ...base, id: 'b', type: 'headache', ts: NOW - 10 * DAY, level: 3, note: '' },
  { ...base, id: 'c', type: 'headache', ts: NOW - 40 * DAY, level: 5, note: '' },
  { ...base, id: 'd', type: 'medication', ts: NOW - 1 * DAY + 1000, name: 'イブ', note: '', photoId: null },
  { ...base, id: 'e', type: 'pressure', ts: NOW },
]

test('頭痛・服薬の件数と期間別の集計', () => {
  const s = computeStats(records, NOW)
  assert.equal(s.headaches, 3)
  assert.equal(s.last7, 1)
  assert.equal(s.last30, 2)
  assert.equal(s.medications, 1)
  assert.equal(s.byLevel[3], 2)
  assert.equal(s.byLevel[5], 1)
  assert.deepEqual(s.byMedicine, [{ name: 'イブ', count: 1 }])
})

test('気圧だけの記録は日数や期間に数えない', () => {
  const s = computeStats(records, NOW)
  assert.equal(s.days, 3)
  assert.equal(s.range?.to, NOW - 1 * DAY + 1000)
})

test('記録が無ければ期間は null', () => {
  const s = computeStats([], NOW)
  assert.equal(s.range, null)
  assert.equal(s.headaches, 0)
})

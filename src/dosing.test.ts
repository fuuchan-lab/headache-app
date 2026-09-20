import assert from 'node:assert/strict'
import { test } from 'node:test'
import { latestMedication, remainingUntilNextDose } from './dosing.ts'
import type { AppRecord } from './types.ts'

const MIN = 60_000
const HOUR = 3_600_000
const T0 = Date.UTC(2026, 8, 21, 0, 0)

test('服薬間隔がない薬は null（表示しない）', () => {
  assert.equal(remainingUntilNextDose(T0, undefined, T0 + 10 * MIN), null)
  assert.equal(remainingUntilNextDose(T0, 0, T0 + 10 * MIN), null)
})

test('6時間の薬を12分前に飲んだ場合、あと5時間48分', () => {
  assert.equal(remainingUntilNextDose(T0, 6, T0 + 12 * MIN), 5 * HOUR + 48 * MIN)
})

test('間隔ちょうど、または過ぎていれば 0（次の服薬が可能）', () => {
  assert.equal(remainingUntilNextDose(T0, 6, T0 + 6 * HOUR), 0)
  assert.equal(remainingUntilNextDose(T0, 6, T0 + 7 * HOUR), 0)
})

test('1分に満たない端数は切り上げ、「あと0分」にならない', () => {
  // 残り 30 秒 → あと1分
  assert.equal(remainingUntilNextDose(T0, 6, T0 + 6 * HOUR - 30_000), MIN)
  // 残り 1 秒 → あと1分
  assert.equal(remainingUntilNextDose(T0, 6, T0 + 6 * HOUR - 1_000), MIN)
})

test('0.5時間刻みの間隔（4.5時間）も扱える', () => {
  assert.equal(remainingUntilNextDose(T0, 4.5, T0), 4 * HOUR + 30 * MIN)
})

const base = { lat: null, lon: null, pressure: null, synced: true, createdAt: 0, updatedAt: 0 }
const med = (id: string, name: string, ts: number, extra: Partial<AppRecord> = {}): AppRecord =>
  ({ ...base, id, type: 'medication', ts, name, tablets: 1, note: '', photoId: null, ...extra }) as AppRecord

test('latestMedication: 薬が2種類以上あっても、最後に服薬したものを返す（並び順に依存しない）', () => {
  const records = [med('a', 'ロキソニン', T0 + 1 * HOUR), med('c', 'バファリン', T0 + 5 * HOUR), med('b', 'カロナール', T0 + 3 * HOUR)]
  assert.equal(latestMedication(records)?.id, 'c')
  assert.equal(latestMedication([...records].reverse())?.id, 'c')
})

test('latestMedication: 頭痛・気圧の記録や削除済みは対象外。服薬がなければ undefined', () => {
  const headache = { ...base, id: 'h', type: 'headache', ts: T0 + 9 * HOUR, level: 3, note: '' } as AppRecord
  const deleted = med('d', 'ロキソニン', T0 + 8 * HOUR, { deleted: true })
  assert.equal(latestMedication([headache, deleted, med('a', 'カロナール', T0)])?.id, 'a')
  assert.equal(latestMedication([headache, deleted]), undefined)
  assert.equal(latestMedication([]), undefined)
})

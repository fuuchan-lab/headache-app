import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeRecord, monthOf, parseMonthFile, serializeMonth, toRemote } from './syncMerge.ts'
import type { AppRecord, HeadacheRecord } from './types.ts'

const base: HeadacheRecord = {
  id: 'a',
  type: 'headache',
  ts: 1_000,
  createdAt: Date.UTC(2026, 8, 20, 12),
  updatedAt: 1_000,
  level: 3,
  note: '',
  pressure: 1010,
  lat: null,
  lon: null,
  synced: true,
}

test('monthOf は作成時刻(UTC)の年月を返す', () => {
  assert.equal(monthOf(base), '2026-09')
  assert.equal(monthOf({ createdAt: Date.UTC(2026, 11, 31, 23, 59) }), '2026-12')
})

test('ドライブ側が新しければ取り込み、同期済みにする', () => {
  const remote = toRemote({ ...base, level: 5, updatedAt: 2_000 })
  const out = mergeRecord(base, remote)
  assert.equal(out.fromRemote, true)
  assert.equal((out.record as HeadacheRecord).level, 5)
  assert.equal(out.record?.synced, true)
})

test('端末にない記録は取り込む', () => {
  const out = mergeRecord(undefined, toRemote(base))
  assert.equal(out.fromRemote, true)
  assert.equal(out.record?.id, 'a')
})

test('端末側が新しく同期済み扱いなら、未同期に戻して再アップロードさせる', () => {
  const local: AppRecord = { ...base, updatedAt: 3_000, synced: true }
  const out = mergeRecord(local, toRemote({ ...base, updatedAt: 1_000 }))
  assert.equal(out.fromRemote, false)
  assert.equal(out.record?.synced, false)
})

test('端末側が新しく未同期なら何もしない（後のアップロードで反映される）', () => {
  const local: AppRecord = { ...base, updatedAt: 3_000, synced: false }
  assert.equal(mergeRecord(local, toRemote({ ...base, updatedAt: 1_000 })).record, null)
})

test('同じ更新時刻なら何もしない', () => {
  assert.equal(mergeRecord(base, toRemote(base)).record, null)
})

test('削除の印も新しい方として取り込まれる', () => {
  const out = mergeRecord(base, toRemote({ ...base, deleted: true, updatedAt: 5_000 }))
  assert.equal(out.record?.deleted, true)
})

test('serializeMonth と parseMonthFile は往復でき、synced を含まない', () => {
  const text = serializeMonth([base, { ...base, id: 'b', createdAt: base.createdAt - 10 }])
  assert.ok(!text.includes('synced'))
  const parsed = parseMonthFile(text)
  assert.deepEqual(
    parsed.map((r) => r.id),
    ['b', 'a'],
  )
})

test('parseMonthFile は不正な行を捨て、構造が違うファイルは例外にする', () => {
  const text = JSON.stringify({ records: [toRemote(base), { id: 1 }, null, { ...toRemote(base), type: 'x' }] })
  assert.equal(parseMonthFile(text).length, 1)
  assert.throws(() => parseMonthFile('{"foo":1}'))
  assert.throws(() => parseMonthFile('not json'))
})

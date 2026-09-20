import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mergeMedicines,
  parseSettings,
  planSettingsSync,
  sameMedicines,
  serializeSettings,
} from './settingsMerge.ts'
import { DEFAULT_MEDICINES, addMedicine, removeMedicine, updateMedicine, visibleMedicines, type Medicine } from './settings.ts'

const med = (id: string, name: string, createdAt: number, updatedAt = createdAt, extra: Partial<Medicine> = {}): Medicine => ({
  id,
  name,
  color: '#000000',
  createdAt,
  updatedAt,
  ...extra,
})

test('片方にしかない薬は、合わせた後に両方に入る', () => {
  const a = [...DEFAULT_MEDICINES, med('a1', 'イブ', 100)]
  const b = [...DEFAULT_MEDICINES, med('b1', 'ナロン', 200)]
  const merged = mergeMedicines(a, b)
  assert.deepEqual(
    merged.map((m) => m.name),
    ['ロキソニン', 'カロナール', 'バファリン', 'イブ', 'ナロン'],
  )
})

test('同じ薬は、更新時刻の新しい方（名前・色の変更）を採用する', () => {
  const edited = updateMedicine(DEFAULT_MEDICINES, 'default-0', 'ロキソプロフェン', '#123456', 1_000)
  assert.ok(edited.ok)
  if (!edited.ok) return
  // 端末B（未編集）と合わせても、端末Aの編集が残る。どちらを local にしても結果は同じ
  const one = mergeMedicines(edited.medicines, DEFAULT_MEDICINES)
  const two = mergeMedicines(DEFAULT_MEDICINES, edited.medicines)
  assert.equal(one[0].name, 'ロキソプロフェン')
  assert.equal(one[0].color, '#123456')
  assert.ok(sameMedicines(one, two))
})

test('削除は他の端末にも伝わり、追加し直しは別の薬として残る', () => {
  const removed = removeMedicine(DEFAULT_MEDICINES, 'default-1', 5_000)
  const merged = mergeMedicines(DEFAULT_MEDICINES, removed)
  assert.deepEqual(
    visibleMedicines(merged).map((m) => m.name),
    ['ロキソニン', 'バファリン'],
  )
  // 削除した後に同じ名前を追加できる
  const readded = addMedicine(merged, 'カロナール', 'new-id', 6_000)
  assert.ok(readded.ok)
})

test('古い削除より新しい編集が勝つ（削除した端末より後に、別の端末で編集した場合）', () => {
  const removed = removeMedicine(DEFAULT_MEDICINES, 'default-2', 2_000)
  const edited = updateMedicine(DEFAULT_MEDICINES, 'default-2', 'バファリンA', '#111111', 3_000)
  assert.ok(edited.ok)
  if (!edited.ok) return
  const merged = mergeMedicines(removed, edited.medicines)
  assert.equal(visibleMedicines(merged).find((m) => m.id === 'default-2')?.name, 'バファリンA')
})

test('2台で同じ名前の薬を別々に追加した場合は、作成の早い方だけ残り、どちらで合わせても同じ結果', () => {
  const a = [...DEFAULT_MEDICINES, med('a', 'イブ', 100, 100)]
  const b = [...DEFAULT_MEDICINES, med('b', 'イブ', 200, 200)]
  const ab = mergeMedicines(a, b)
  const ba = mergeMedicines(b, a)
  assert.ok(sameMedicines(ab, ba))
  assert.deepEqual(
    visibleMedicines(ab).filter((m) => m.name === 'イブ').map((m) => m.id),
    ['a'],
  )
})

test('並び順は作成時刻で決まり、端末ごとの並びの違いで揺れない（合わせ直しても同じ）', () => {
  const list = [med('z', 'Z', 300), med('y', 'Y', 100), med('x', 'X', 200)]
  const once = mergeMedicines(list, [])
  assert.deepEqual(
    once.map((m) => m.id),
    ['y', 'x', 'z'],
  )
  assert.ok(sameMedicines(mergeMedicines(once, list), once))
})

test('同じ更新時刻で内容が違っても、どちらで合わせても同じ結果になる', () => {
  const a = [med('m', 'A', 1, 5)]
  const b = [med('m', 'B', 1, 5)]
  assert.ok(sameMedicines(mergeMedicines(a, b), mergeMedicines(b, a)))
})

test('serializeSettings と parseSettings は往復でき、壊れた行は捨てる', () => {
  const list = [...DEFAULT_MEDICINES, med('d', '削除済み', 9, 10, { deleted: true })]
  assert.ok(sameMedicines(parseSettings(serializeSettings(list)), list))
  const broken = JSON.stringify({ medicines: [{ id: 'x' }, null, { id: 1, name: 'a', color: 'b' }, ...list] })
  assert.equal(parseSettings(broken).length, list.length)
  assert.throws(() => parseSettings('{"a":1}'))
  assert.throws(() => parseSettings('not json'))
})

test('planSettingsSync: ドライブにファイルがなければ、初回として送る', () => {
  const plan = planSettingsSync(DEFAULT_MEDICINES, null, false, false)
  assert.equal(plan.upload, true)
  assert.equal(plan.saveLocal, false)
})

test('planSettingsSync: 変更がなく、ドライブも同じなら何もしない', () => {
  const plan = planSettingsSync(DEFAULT_MEDICINES, DEFAULT_MEDICINES, true, false)
  assert.deepEqual([plan.saveLocal, plan.upload], [false, false])
  // 前回から変わっていなくて読み込まなかった場合も同じ
  const skipped = planSettingsSync(DEFAULT_MEDICINES, null, true, false)
  assert.deepEqual([skipped.saveLocal, skipped.upload], [false, false])
})

test('planSettingsSync: この端末で変更した時は、ドライブへ送る', () => {
  const edited = updateMedicine(DEFAULT_MEDICINES, 'default-0', 'ロキソプロフェン', '#123456', 1_000)
  assert.ok(edited.ok)
  if (!edited.ok) return
  const plan = planSettingsSync(edited.medicines, null, true, true)
  assert.equal(plan.upload, true)
})

test('planSettingsSync: 他の端末で変更されていた時は、この端末に取り込み、送り返さない', () => {
  const edited = updateMedicine(DEFAULT_MEDICINES, 'default-0', 'ロキソプロフェン', '#123456', 1_000)
  assert.ok(edited.ok)
  if (!edited.ok) return
  const plan = planSettingsSync(DEFAULT_MEDICINES, edited.medicines, true, false)
  assert.equal(plan.saveLocal, true)
  assert.equal(plan.upload, false)
  assert.equal(plan.merged[0].name, 'ロキソプロフェン')
})

test('planSettingsSync: 両方に別々の変更がある時は、合わせた結果を取り込み、ドライブにも送る', () => {
  const remote = [...DEFAULT_MEDICINES, med('r', 'ナロン', 100)]
  const local = [...DEFAULT_MEDICINES, med('l', 'イブ', 200)]
  const plan = planSettingsSync(local, remote, true, true)
  assert.equal(plan.saveLocal, true)
  assert.equal(plan.upload, true)
  assert.equal(visibleMedicines(plan.merged).length, 5)
})

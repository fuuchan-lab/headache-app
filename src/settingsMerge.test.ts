import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mergeMedicines,
  parseSettings,
  planSettingsSync,
  sameMedicines,
  serializeSettings,
} from './settingsMerge.ts'
import { DEFAULT_MEDICINES, addMedicine, moveMedicine, removeMedicine, updateMedicine, visibleMedicines, type Medicine } from './settings.ts'

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

test('服薬間隔の変更も、更新時刻の新しい方が採用され、ドライブとの往復でも失われない', () => {
  const edited = updateMedicine(DEFAULT_MEDICINES, 'default-0', 'ロキソニン', '#123456', 1_000, 6)
  assert.ok(edited.ok)
  if (!edited.ok) return
  const merged = mergeMedicines(DEFAULT_MEDICINES, edited.medicines)
  assert.equal(merged[0].intervalHours, 6)
  assert.ok(sameMedicines(merged, mergeMedicines(edited.medicines, DEFAULT_MEDICINES)))
  const roundTrip = parseSettings(serializeSettings(merged))
  assert.equal(roundTrip[0].intervalHours, 6)
  assert.ok(sameMedicines(roundTrip, merged))
  // 服薬間隔だけが違う場合も、別の内容として扱われる（同期で送られる）
  const plan = planSettingsSync(edited.medicines, DEFAULT_MEDICINES, true, false)
  assert.equal(plan.upload, true)
})

test('他の端末で服薬間隔をなくした場合も、新しい方（なし）が採用される', () => {
  const set = updateMedicine(DEFAULT_MEDICINES, 'default-1', 'カロナール', '#111111', 1_000, 4)
  assert.ok(set.ok)
  if (!set.ok) return
  const cleared = updateMedicine(set.medicines, 'default-1', 'カロナール', '#111111', 2_000, null)
  assert.ok(cleared.ok)
  if (!cleared.ok) return
  const merged = mergeMedicines(set.medicines, cleared.medicines)
  assert.equal(merged[1].intervalHours, undefined)
})

const names = (list: Medicine[]) => visibleMedicines(list).map((m) => m.name)

test('薬を1つ上・下へ動かせる。端では動かない', () => {
  const up = moveMedicine(DEFAULT_MEDICINES, 'default-2', -1, 1_000)
  assert.deepEqual(names(up), ['ロキソニン', 'バファリン', 'カロナール'])
  const down = moveMedicine(up, 'default-0', 1, 2_000)
  assert.deepEqual(names(down), ['バファリン', 'ロキソニン', 'カロナール'])
  // 先頭を上へ・末尾を下へは、何も変えない（同じものを返す）
  assert.equal(moveMedicine(DEFAULT_MEDICINES, 'default-0', -1), DEFAULT_MEDICINES)
  assert.equal(moveMedicine(DEFAULT_MEDICINES, 'default-2', 1), DEFAULT_MEDICINES)
  assert.equal(moveMedicine(DEFAULT_MEDICINES, 'nothing', 1), DEFAULT_MEDICINES)
})

test('並べ替えた後に追加した薬は、いちばん下に入る。削除した薬は並び順に影響しない', () => {
  let list = moveMedicine(DEFAULT_MEDICINES, 'default-2', -1, 1_000)
  const added = addMedicine(list, 'イブ', 'new-1', 5_000)
  assert.ok(added.ok)
  if (!added.ok) return
  list = removeMedicine(added.medicines, 'default-1', 6_000)
  assert.deepEqual(names(list), ['ロキソニン', 'バファリン', 'イブ'])
  assert.deepEqual(names(moveMedicine(list, 'new-1', -1, 7_000)), ['ロキソニン', 'イブ', 'バファリン'])
})

test('並べ替えは、端末どうしで合わせても保たれ、どちらを local にしても同じ順になる', () => {
  const reordered = moveMedicine(DEFAULT_MEDICINES, 'default-2', -1, 1_000)
  const one = mergeMedicines(reordered, DEFAULT_MEDICINES)
  const two = mergeMedicines(DEFAULT_MEDICINES, reordered)
  assert.deepEqual(names(one), ['ロキソニン', 'バファリン', 'カロナール'])
  assert.ok(sameMedicines(one, two))
})

test('並び順の位置（order）は、ドライブのファイルに書き出して読み戻せる', () => {
  const reordered = moveMedicine(DEFAULT_MEDICINES, 'default-2', -1, 1_000)
  const back = parseSettings(serializeSettings(reordered))
  assert.ok(sameMedicines(back, reordered))
  assert.deepEqual(names(back), ['ロキソニン', 'バファリン', 'カロナール'])
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonicalMedicineName, localizeMedicineName } from './medicineNames.ts'
import {
  DEFAULT_MEDICINES,
  MEDICINE_COLORS,
  addMedicine,
  colorFor,
  parseIntervalHours,
  updateMedicine,
} from './settings.ts'

test('初期の薬は、言語に合わせた名前で表示する', () => {
  assert.equal(localizeMedicineName('ロキソニン', 'en'), 'Loxonin')
  assert.equal(localizeMedicineName('カロナール', 'en'), 'Calonal')
  assert.equal(localizeMedicineName('バファリン', 'en'), 'Bufferin')
  assert.equal(localizeMedicineName('ロキソニン', 'ja'), 'ロキソニン')
})

test('英語名で保存されていても、表示は言語に合わせる（大文字小文字・空白は無視）', () => {
  assert.equal(localizeMedicineName('Loxonin', 'ja'), 'ロキソニン')
  assert.equal(localizeMedicineName(' bufferin ', 'ja'), 'バファリン')
  assert.equal(localizeMedicineName('Bufferin', 'en'), 'Bufferin')
})

test('初期の薬以外の名前は、そのまま表示する', () => {
  assert.equal(localizeMedicineName('イブ', 'en'), 'イブ')
  assert.equal(localizeMedicineName('Ibuprofen', 'ja'), 'Ibuprofen')
})

test('保存する名前は、初期の薬の英語名を日本語名に揃える', () => {
  assert.equal(canonicalMedicineName('Loxonin'), 'ロキソニン')
  assert.equal(canonicalMedicineName('  calonal '), 'カロナール')
  assert.equal(canonicalMedicineName(' イブ '), 'イブ')
})

test('初期の薬は日本語名で持ち、それぞれ違う色', () => {
  assert.deepEqual(
    DEFAULT_MEDICINES.map((m) => m.name),
    ['ロキソニン', 'カロナール', 'バファリン'],
  )
  assert.equal(new Set(DEFAULT_MEDICINES.map((m) => m.color)).size, 3)
})

test('addMedicine: 空欄・重複（英語名の重複も）は追加しない', () => {
  assert.deepEqual(addMedicine(DEFAULT_MEDICINES, '  ', 'x'), { ok: false, reason: 'empty' })
  assert.deepEqual(addMedicine(DEFAULT_MEDICINES, 'ロキソニン', 'x'), { ok: false, reason: 'duplicate' })
  assert.deepEqual(addMedicine(DEFAULT_MEDICINES, 'loxonin', 'x'), { ok: false, reason: 'duplicate' })
  const added = addMedicine(DEFAULT_MEDICINES, 'イブ', 'x')
  assert.ok(added.ok && added.medicines.length === 4 && added.medicines[3].name === 'イブ')
})

test('updateMedicine: 初期の薬の名前と色を変えられ、変更前の名前を返す', () => {
  const r = updateMedicine(DEFAULT_MEDICINES, 'default-0', 'ロキソプロフェン', MEDICINE_COLORS[3])
  assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.oldName, 'ロキソニン')
  assert.equal(r.newName, 'ロキソプロフェン')
  assert.equal(r.medicines[0].name, 'ロキソプロフェン')
  assert.equal(r.medicines[0].color, MEDICINE_COLORS[3])
  // 色分けは新しい名前で引ける
  assert.equal(colorFor(r.medicines, 'ロキソプロフェン'), MEDICINE_COLORS[3])
})

test('updateMedicine: 色だけ変えた時は名前が変わらない。英語名を入れても初期の薬の名前のまま', () => {
  const r = updateMedicine(DEFAULT_MEDICINES, 'default-1', 'Calonal', '#000000')
  assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.oldName, r.newName)
  assert.equal(r.newName, 'カロナール')
})

test('updateMedicine: 空欄・他の薬と同じ名前・存在しないIDは受け付けない', () => {
  assert.deepEqual(updateMedicine(DEFAULT_MEDICINES, 'default-0', ' ', '#000'), { ok: false, reason: 'empty' })
  assert.deepEqual(updateMedicine(DEFAULT_MEDICINES, 'default-0', 'カロナール', '#000'), { ok: false, reason: 'duplicate' })
  assert.deepEqual(updateMedicine(DEFAULT_MEDICINES, 'default-0', 'Bufferin', '#000'), { ok: false, reason: 'duplicate' })
  assert.deepEqual(updateMedicine(DEFAULT_MEDICINES, 'nope', 'イブ', '#000'), { ok: false, reason: 'missing' })
})

test('updateMedicine: 自分自身と同じ名前のままなら保存できる', () => {
  assert.ok(updateMedicine(DEFAULT_MEDICINES, 'default-0', 'ロキソニン', '#111111').ok)
})

test('parseIntervalHours: 空欄は「決めていない」として受け付ける', () => {
  assert.deepEqual(parseIntervalHours(''), { ok: true, hours: null })
  assert.deepEqual(parseIntervalHours('   '), { ok: true, hours: null })
})

test('parseIntervalHours: 0.5〜72 の数字（半角・全角）を時間として読み取る', () => {
  assert.deepEqual(parseIntervalHours('6'), { ok: true, hours: 6 })
  assert.deepEqual(parseIntervalHours(' 4.5 '), { ok: true, hours: 4.5 })
  assert.deepEqual(parseIntervalHours('０.５'), { ok: true, hours: 0.5 })
  assert.deepEqual(parseIntervalHours('８'), { ok: true, hours: 8 })
  assert.deepEqual(parseIntervalHours('72'), { ok: true, hours: 72 })
  assert.deepEqual(parseIntervalHours('6．5'), { ok: true, hours: 6.5 })
})

test('parseIntervalHours: 範囲外・数字でないものは受け付けない', () => {
  for (const bad of ['0', '0.4', '73', '-1', 'abc', '6時間', '1e2', '6,5', '.5', '5.']) {
    assert.deepEqual(parseIntervalHours(bad), { ok: false }, bad)
  }
})

test('updateMedicine: 服薬間隔を設定でき、空欄(null)で「決めていない」に戻る。省略なら今のまま', () => {
  const set = updateMedicine(DEFAULT_MEDICINES, 'default-0', 'ロキソニン', '#111111', 1_000, 6)
  assert.ok(set.ok)
  if (!set.ok) return
  assert.equal(set.medicines[0].intervalHours, 6)
  // 服薬間隔を省略して保存しても、設定した値は残る
  const keep = updateMedicine(set.medicines, 'default-0', 'ロキソニン', '#222222', 2_000)
  assert.ok(keep.ok && keep.medicines[0].intervalHours === 6)
  // 空欄で保存すると、項目ごとなくなる
  const cleared = updateMedicine(set.medicines, 'default-0', 'ロキソニン', '#111111', 3_000, null)
  assert.ok(cleared.ok)
  if (!cleared.ok) return
  assert.ok(!('intervalHours' in cleared.medicines[0]))
})

test('服薬間隔がない薬は、初期の薬も含めて、項目を持たない', () => {
  for (const m of DEFAULT_MEDICINES) assert.ok(!('intervalHours' in m))
})

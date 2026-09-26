import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exportFileName, exportPackageName, pressureSheet, recordsSheet } from './excelData.ts'
import { buildWorkbook } from './excelWorkbook.ts'
import { translate, type TFn } from './i18n/context.ts'
import type { AppRecord } from './types.ts'

const tJa: TFn = (key, vars) => translate('ja', key, vars)
const tEn: TFn = (key, vars) => translate('en', key, vars)

const base = { lat: 35.68, lon: 139.76, synced: true, createdAt: 0, updatedAt: 0 }

const records: AppRecord[] = [
  {
    ...base,
    id: 'm1',
    type: 'medication',
    ts: Date.UTC(2026, 8, 20, 3),
    name: 'ロキソニン',
    tablets: 1.5,
    note: '食後\n半分',
    photoId: 'p',
    pressure: 1004.26,
  },
  { ...base, id: 'h1', type: 'headache', ts: Date.UTC(2026, 8, 20, 1), level: 3, note: '', pressure: 1006 },
  { ...base, id: 'p1', type: 'pressure', ts: Date.UTC(2026, 8, 20, 2), pressure: 1005.5 },
  {
    ...base,
    id: 'd1',
    type: 'headache',
    ts: Date.UTC(2026, 8, 20, 4),
    level: 5,
    note: '削除済み',
    pressure: 1000,
    deleted: true,
  },
]

test('exportFileName は Headache_YYYYMMDD-HHMM.xlsx の形式（ローカル時刻。: は使わない）', () => {
  assert.equal(exportFileName(new Date(2026, 8, 21, 0, 15)), 'Headache_20260921-0015.xlsx')
  assert.equal(exportFileName(new Date(2026, 0, 5, 9, 7)), 'Headache_20260105-0907.xlsx')
  assert.equal(exportFileName(new Date(2026, 11, 31, 23, 59)), 'Headache_20261231-2359.xlsx')
})

test('exportPackageName は、フォルダー名・ZIP名に使う Headache_YYYYMMDD-HHMM（Excel 名から拡張子を除いたもの）', () => {
  const d = new Date(2026, 8, 21, 0, 15)
  assert.equal(exportPackageName(d), 'Headache_20260921-0015')
  assert.equal(`${exportPackageName(d)}.xlsx`, exportFileName(d))
})

test('recordsSheet は見出し行のあと、頭痛と服薬を古い順に並べ、気圧ログと削除済みは含めない', () => {
  const { data } = recordsSheet(records, tJa)
  assert.equal(data.length, 1 + 2)
  assert.deepEqual(
    data[0].map((c) => c?.value),
    ['日時', '種別', '頭痛レベル(0-5)', '頭痛の程度', '薬', '錠数', '気圧(hPa)', '付箋メモ', '写真', '緯度', '経度'],
  )
  assert.equal(data[1][1]?.value, '頭痛')
  assert.equal(data[1][2]?.value, 3)
  assert.equal(data[1][3]?.value, '痛い')
  assert.equal(data[1][7], null) // 空のメモは空セル
  assert.equal(data[2][1]?.value, '服薬')
  assert.equal(data[2][4]?.value, 'ロキソニン')
  assert.equal(data[2][5]?.value, 1.5)
  assert.equal(data[2][6]?.value, 1004.26)
  assert.equal(data[2][7]?.value, '食後\n半分')
  assert.equal(data[2][8]?.value, '有')
})

test('日時のセルは、端末のローカル時刻の年月日時分がそのまま表示される値になる', () => {
  // ローカル時刻 2026-09-20 10:05 の記録（テストを実行する環境のタイムゾーンによらない）
  const ts = new Date(2026, 8, 20, 10, 5).getTime()
  const { data } = recordsSheet([{ ...base, id: 'x', type: 'headache', ts, level: 1, note: '', pressure: 1000 }], tJa)
  const cell = data[1][0]
  assert.ok(cell?.value instanceof Date)
  // ライブラリは Date を UTC として書くため、UTC の年月日時分がローカル時刻と一致していればよい
  assert.deepEqual(
    [cell.value.getUTCFullYear(), cell.value.getUTCMonth(), cell.value.getUTCDate(), cell.value.getUTCHours(), cell.value.getUTCMinutes()],
    [2026, 8, 20, 10, 5],
  )
  assert.equal(cell.format, 'yyyy/mm/dd hh:mm')
})

test('pressureSheet は自動で残した気圧の記録だけを古い順に並べる', () => {
  const { data } = pressureSheet(records, tJa)
  assert.equal(data.length, 2)
  assert.equal(data[1][1]?.value, 1005.5)
})

test('見出しや種別は英語表示にも切り替わる', () => {
  const { data } = recordsSheet(records, tEn)
  assert.equal(data[0][0]?.value, 'Date & time')
  assert.equal(data[1][1]?.value, 'Headache')
  assert.equal(data[1][3]?.value, 'Painful')
  assert.equal(data[2][8]?.value, 'Yes')
})

test('buildWorkbook は xlsx (zip) の Blob を返す', async () => {
  const blob = await buildWorkbook(records, tJa)
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  assert.deepEqual([...head], [0x50, 0x4b]) // "PK"
  assert.ok(blob.size > 1000)
})

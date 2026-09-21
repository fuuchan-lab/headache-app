/** Excel に書き出す表の中身を作る。ライブラリに依存しない部分（テストしやすいよう分けている） */
import type { Lang, TFn } from './i18n/context.ts'
import { localizeMedicineName } from './medicineNames.ts'
import type { AppRecord } from './types.ts'

interface Cell {
  value: string | number | Date
  format?: string
  fontWeight?: 'bold'
  backgroundColor?: string
  align?: 'left' | 'center' | 'right'
  wrap?: boolean
  alignVertical?: 'top' | 'center' | 'bottom'
}

/** 空のセルは null */
type Row = (Cell | null)[]

export interface SheetContent {
  data: Row[]
  columns: { width: number }[]
}

const DATE_FORMAT = 'yyyy/mm/dd hh:mm'
const HEADER_BG = '#ccfbf1'

const header = (labels: string[]): Row =>
  labels.map((value) => ({ value, fontWeight: 'bold', backgroundColor: HEADER_BG, align: 'center' }))

const num = (value: number | null | undefined, format?: string): Cell | null =>
  value === null || value === undefined ? null : { value, format, align: 'right' }
/**
 * 日時のセル。Excel には時刻だけが入り、タイムゾーンの情報がない。ライブラリは Date を UTC として書くので、
 * 端末のローカル時刻（年月日時分）がそのままセルに表示されるよう、UTC の値としてその年月日時分を持つ Date にする。
 */
const when = (ts: number): Cell => {
  const d = new Date(ts)
  const asUtc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()))
  return { value: asUtc, format: DATE_FORMAT, align: 'left' }
}

/** 記録（頭痛・服薬）の一覧。古い順 */
export function recordsSheet(records: AppRecord[], t: TFn, lang: Lang = 'ja'): SheetContent {
  const rows = records
    .filter((r) => !r.deleted)
    .sort((a, b) => a.ts - b.ts)
    .flatMap((r): Row[] => {
      if (r.type === 'headache') {
        return [
          [
            when(r.ts),
            { value: t('xlsx.typeHeadache') },
            num(r.level),
            { value: t(`level.${r.level}`) },
            null,
            null,
            num(r.pressure, '0.0'),
            note(r.note),
            null,
            num(r.lat, '0.0000'),
            num(r.lon, '0.0000'),
          ],
        ]
      }
      if (r.type === 'medication') {
        return [
          [
            when(r.ts),
            { value: t('xlsx.typeMedication') },
            null,
            null,
            { value: localizeMedicineName(r.name, lang) },
            num(r.tablets),
            num(r.pressure, '0.0'),
            note(r.note),
            r.photoId ? { value: t('xlsx.photoYes'), align: 'center' } : null,
            num(r.lat, '0.0000'),
            num(r.lon, '0.0000'),
          ],
        ]
      }
      return []
    })

  return {
    data: [
      header([
        t('xlsx.colTime'),
        t('xlsx.colType'),
        t('xlsx.colLevel'),
        t('xlsx.colSeverity'),
        t('xlsx.colMedicine'),
        t('xlsx.colTablets'),
        t('xlsx.colPressure'),
        t('xlsx.colNote'),
        t('xlsx.colPhoto'),
        t('xlsx.colLat'),
        t('xlsx.colLon'),
      ]),
      ...rows,
    ],
    columns: [
      { width: 18 },
      { width: 10 },
      { width: 14 },
      { width: 14 },
      { width: 16 },
      { width: 9 },
      { width: 14 },
      { width: 36 },
      { width: 8 },
      { width: 11 },
      { width: 11 },
    ],
  }
}

/** 付箋メモは複数行のことがあるので、セルの中で折り返して表示する */
function note(value: string): Cell | null {
  return value === '' ? null : { value, wrap: true, alignVertical: 'top' }
}

/** アプリを開いた時に自動で残した気圧の記録。古い順 */
export function pressureSheet(records: AppRecord[], t: TFn): SheetContent {
  const rows = records
    .filter((r) => !r.deleted && r.type === 'pressure')
    .sort((a, b) => a.ts - b.ts)
    .map((r): Row => [when(r.ts), num(r.pressure, '0.0'), num(r.lat, '0.0000'), num(r.lon, '0.0000')])

  return {
    data: [header([t('xlsx.colTime'), t('xlsx.colPressure'), t('xlsx.colLat'), t('xlsx.colLon')]), ...rows],
    columns: [{ width: 18 }, { width: 14 }, { width: 11 }, { width: 11 }],
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 書き出すファイルの名前。例: Headache_20260921-00:15.xlsx（端末のローカル時刻） */
export function exportFileName(d: Date): string {
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  return `Headache_${date}-${pad(d.getHours())}:${pad(d.getMinutes())}.xlsx`
}

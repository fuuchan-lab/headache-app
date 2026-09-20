import writeExcelFile from 'write-excel-file/universal'
import { pressureSheet, recordsSheet } from './excelData.ts'
import type { TFn } from './i18n/context.ts'
import type { AppRecord } from './types.ts'

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** 記録の一覧を Excel ブック (.xlsx) にする。「記録」と「気圧ログ」の2シート、1行目は固定 */
export async function buildWorkbook(records: AppRecord[], t: TFn): Promise<Blob> {
  const list = recordsSheet(records, t)
  const pressure = pressureSheet(records, t)
  return writeExcelFile([
    { data: list.data, sheet: t('xlsx.sheetRecords'), columns: list.columns, stickyRowsCount: 1 },
    { data: pressure.data, sheet: t('xlsx.sheetPressure'), columns: pressure.columns, stickyRowsCount: 1 },
  ]).toBlob()
}

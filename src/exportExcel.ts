import { ensureFolder, uploadFile } from './drive.ts'
import { exportFileName } from './excelData.ts'
import { XLSX_MIME, buildWorkbook } from './excelWorkbook.ts'
import type { Lang, TFn } from './i18n/context.ts'
import type { AppRecord } from './types.ts'

export interface ExportResult {
  /** Google ドライブに保存したファイルの名前 */
  name: string
  /** ドライブ上のファイルID（開くリンクに使う） */
  id: string
}

/**
 * 記録の一覧を Excel にして、Google ドライブのアプリ用フォルダーに保存する。
 * 書き出すたびに、時刻入りの名前（Headache_YYYYMMDD-HH:MM.xlsx）の新しいファイルを作る。
 */
export async function exportToDrive(records: AppRecord[], t: TFn, lang: Lang, now = new Date()): Promise<ExportResult> {
  const blob = await buildWorkbook(records, t, lang)
  const folderId = await ensureFolder()
  const name = exportFileName(now)
  const { id } = await uploadFile({ name, mimeType: XLSX_MIME, blob, parentId: folderId })
  return { name, id }
}

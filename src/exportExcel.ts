import { getPhoto } from './db.ts'
import { ensureFolder, ensureSubfolder, uploadFile } from './drive.ts'
import { exportFileName, exportPackageName } from './excelData.ts'
import { XLSX_MIME, buildWorkbook } from './excelWorkbook.ts'
import type { Lang, TFn } from './i18n/context.ts'
import { PACKAGE_DATA_FILE, photoFileName, serializeMonth } from './syncMerge.ts'
import type { AppRecord } from './types.ts'
import { createZip, type ZipEntry } from './zip.ts'

export interface ExportResult {
  /** 保存したフォルダー（ドライブ）・ファイル（端末の ZIP）の名前 */
  name: string
  /** Google ドライブに保存した場合の、開くリンクに使う ID */
  id?: string
  /** id が、ファイルではなくフォルダーを指しているか */
  isFolder?: boolean
}

/**
 * Excel と一緒に、あとで使えるように、服薬の写真とデータ（JSON。ドライブの同期と同じ形式）も集める。
 * 削除済みの記録は対象外（records は既にそれらを除いたもの）。この端末に無い写真は入れない
 */
async function collectPackageFiles(records: AppRecord[], workbook: Blob, workbookName: string): Promise<ZipEntry[]> {
  const files: ZipEntry[] = [
    { name: workbookName, data: new Uint8Array(await workbook.arrayBuffer()) },
    { name: PACKAGE_DATA_FILE, data: new TextEncoder().encode(serializeMonth(records)) },
  ]
  const seen = new Set<string>()
  for (const r of records) {
    if (r.type !== 'medication' || !r.photoId || seen.has(r.photoId)) continue
    seen.add(r.photoId)
    const photo = await getPhoto(r.photoId)
    if (photo) files.push({ name: photoFileName(r.photoId), data: new Uint8Array(await photo.blob.arrayBuffer()) })
  }
  return files
}

/**
 * Google ドライブに保存する。アプリ用フォルダーの中に、書き出しごとのフォルダー（Headache_YYYYMMDD-HHMM）を作り、
 * その中に Excel・服薬の写真・データ（JSON）をまとめて置く
 */
export async function exportToDrive(records: AppRecord[], t: TFn, lang: Lang, now = new Date()): Promise<ExportResult> {
  const workbook = await buildWorkbook(records, t, lang)
  const folderName = exportPackageName(now)
  const folderId = await ensureFolder()
  const subId = await ensureSubfolder(folderId, folderName)
  for (const f of await collectPackageFiles(records, workbook, exportFileName(now))) {
    await uploadFile({
      name: f.name,
      mimeType: f.name.endsWith('.json') ? 'application/json' : f.name.endsWith('.jpg') ? 'image/jpeg' : XLSX_MIME,
      blob: new Blob([f.data.slice()]),
      parentId: subId,
    })
  }
  return { name: folderName, id: subId, isFolder: true }
}

/** この端末にダウンロードする（ログインしていない時・オフラインの時にも使える）。ZIP に Excel・服薬の写真・データをまとめる */
export async function exportToDevice(records: AppRecord[], t: TFn, lang: Lang, now = new Date()): Promise<ExportResult> {
  const workbook = await buildWorkbook(records, t, lang)
  const zip = await createZip(await collectPackageFiles(records, workbook, exportFileName(now)))
  const name = `${exportPackageName(now)}.zip`
  const url = URL.createObjectURL(zip)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return { name }
}

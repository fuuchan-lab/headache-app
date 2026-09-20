/**
 * 端末（IndexedDB）と Google ドライブの同期。
 *
 * ドライブのフォルダーには、記録を月別の JSON（records-YYYY-MM.json）、写真を photo-<id>.jpg で置く。
 * 各記録は updatedAt が新しい方を採用し、削除は deleted の印で伝える。
 *
 * 前提: 端末の DB には、これまでに見たドライブのファイルの内容がすべて入っている
 * （記録を端末から完全に消すことはない）。そのため、前回から変わっていないファイルは
 * 取得し直さず、アップロードする月ファイルは端末の記録から丸ごと作れる。
 */
import {
  deletePhoto,
  getAllRecords,
  getPhoto,
  getUnsyncedPhotos,
  markPhotoSynced,
  markRecordsSynced,
  putPhoto,
  putRecord,
} from './db.ts'
import {
  deleteFile,
  downloadBlob,
  downloadText,
  ensureFolder,
  listFolderFiles,
  uploadFile,
} from './drive.ts'
import {
  MONTH_FILE_RE,
  mergeRecord,
  monthFileName,
  monthOf,
  parseMonthFile,
  photoFileName,
  serializeMonth,
} from './syncMerge.ts'
import type { AppRecord } from './types.ts'

export interface SyncResult {
  /** ドライブの内容を端末に取り込んだ（画面の更新が必要） */
  changedLocal: boolean
  uploaded: number
}

const INDEX_KEY = 'headache-drive-index'

/** ドライブのファイルID → 前回取り込んだ時の更新時刻 */
function loadIndex(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function saveIndex(index: Record<string, string>) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {
    // 保存できなければ次回は全ファイルを取り込み直すだけ
  }
}

export function clearSyncIndex() {
  try {
    localStorage.removeItem(INDEX_KEY)
  } catch {
    // 無視
  }
}

async function doSync(): Promise<SyncResult> {
  const folderId = await ensureFolder()
  const files = await listFolderFiles(folderId)
  const index = loadIndex()
  let changedLocal = false
  let uploaded = 0

  const photoFiles = new Map(files.filter((f) => f.name.startsWith('photo-')).map((f) => [f.name, f.id]))

  // 1. 未アップロードの写真（記録より先に上げ、失敗したら記録も未同期のまま残す）
  for (const photo of await getUnsyncedPhotos()) {
    const name = photoFileName(photo.id)
    if (!photoFiles.has(name)) {
      const up = await uploadFile({ name, mimeType: 'image/jpeg', blob: photo.blob, parentId: folderId })
      photoFiles.set(name, up.id)
    }
    await markPhotoSynced(photo.id)
  }

  // 2. 前回から変わった月ファイルを取り込む
  const monthFiles = files.filter((f) => MONTH_FILE_RE.test(f.name))
  const local = new Map((await getAllRecords()).map((r) => [r.id, r]))
  for (const f of monthFiles) {
    if (index[f.id] === f.modifiedTime) continue
    for (const remote of parseMonthFile(await downloadText(f.id))) {
      const { record, fromRemote } = mergeRecord(local.get(remote.id), remote)
      if (!record) continue
      await putRecord(record)
      local.set(record.id, record)
      if (fromRemote) {
        changedLocal = true
        if (record.deleted && record.type === 'medication' && record.photoId) await deletePhoto(record.photoId)
      }
    }
    index[f.id] = f.modifiedTime
  }
  saveIndex(index)

  // 3. 未同期の記録がある月のファイルを書き出す
  const all: AppRecord[] = [...local.values()]
  const dirtyMonths = new Set(all.filter((r) => !r.synced).map(monthOf))
  for (const month of dirtyMonths) {
    const inMonth = all.filter((r) => monthOf(r) === month)
    const name = monthFileName(month)
    const existing = monthFiles.find((f) => f.name === name)
    const up = await uploadFile({
      id: existing?.id,
      name,
      mimeType: 'application/json',
      blob: new Blob([serializeMonth(inMonth)], { type: 'application/json' }),
      parentId: folderId,
    })
    index[up.id] = up.modifiedTime
    saveIndex(index)
    const pending = inMonth.filter((r) => !r.synced)
    await markRecordsSynced(pending.map((r) => ({ id: r.id, updatedAt: r.updatedAt })))
    uploaded += pending.length
  }

  // 4. 削除した記録の写真をドライブから消す
  for (const r of all) {
    if (r.type !== 'medication' || !r.deleted || !r.photoId) continue
    const name = photoFileName(r.photoId)
    const id = photoFiles.get(name)
    if (!id) continue
    try {
      await deleteFile(id)
    } catch {
      // すでに消えている場合など。次回また試す必要はない
    }
    photoFiles.delete(name)
  }

  // 5. 他の端末で撮った写真を取り込む
  for (const r of all) {
    if (r.type !== 'medication' || r.deleted || !r.photoId) continue
    const id = photoFiles.get(photoFileName(r.photoId))
    if (!id || (await getPhoto(r.photoId))) continue
    await putPhoto({ id: r.photoId, blob: await downloadBlob(id), synced: true })
    changedLocal = true
  }

  return { changedLocal, uploaded }
}

let running: Promise<SyncResult> | null = null
let rerun = false

/**
 * 同期する。実行中に呼ばれた場合は、いまの同期の後にもう一度だけ実行する
 * （同期中に増えた記録を取りこぼさないため）。
 */
export function syncNow(): Promise<SyncResult> {
  if (running) {
    rerun = true
    return running
  }
  running = (async () => {
    try {
      let result = await doSync()
      while (rerun) {
        rerun = false
        const next = await doSync()
        result = { changedLocal: result.changedLocal || next.changedLocal, uploaded: result.uploaded + next.uploaded }
      }
      return result
    } finally {
      running = null
      rerun = false
    }
  })()
  return running
}

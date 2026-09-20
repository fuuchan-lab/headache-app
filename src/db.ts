import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppRecord, PhotoRecord } from './types.ts'

interface HeadacheDB extends DBSchema {
  records: {
    key: string
    value: AppRecord
    indexes: { 'by-ts': number }
  }
  photos: {
    key: string
    value: PhotoRecord
  }
}

let dbPromise: Promise<IDBPDatabase<HeadacheDB>> | null = null

function getDB() {
  dbPromise ??= openDB<HeadacheDB>('headache-app', 2, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const records = db.createObjectStore('records', { keyPath: 'id' })
        records.createIndex('by-ts', 'ts')
        db.createObjectStore('photos', { keyPath: 'id' })
      }
      if (oldVersion >= 1 && oldVersion < 2) {
        // 同期用の createdAt / updatedAt を、それまでの記録にも付ける
        let cursor = await tx.objectStore('records').openCursor()
        while (cursor) {
          const r = cursor.value
          await cursor.update({ ...r, createdAt: r.createdAt ?? r.ts, updatedAt: r.updatedAt ?? r.ts, synced: false })
          cursor = await cursor.continue()
        }
      }
    },
  })
  return dbPromise
}

/** 削除済みを含む全記録（新しい順）。同期で使う */
export async function getAllRecords(): Promise<AppRecord[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('records', 'by-ts')
  return all.reverse()
}

export async function putRecord(record: AppRecord) {
  const db = await getDB()
  await db.put('records', record)
}

/** 削除は印を付けるだけにして、同期で他の端末にも伝える。写真はこの端末から消す */
export async function softDeleteRecord(record: AppRecord) {
  const db = await getDB()
  await db.put('records', { ...record, deleted: true, updatedAt: Date.now(), synced: false })
  if (record.type === 'medication' && record.photoId) {
    await db.delete('photos', record.photoId)
  }
}

/** 同期の間に編集されていなければ、同期済みにする */
export async function markRecordsSynced(items: { id: string; updatedAt: number }[]) {
  const db = await getDB()
  const tx = db.transaction('records', 'readwrite')
  for (const { id, updatedAt } of items) {
    const cur = await tx.store.get(id)
    if (cur && cur.updatedAt === updatedAt) await tx.store.put({ ...cur, synced: true })
  }
  await tx.done
}

export async function putPhoto(photo: PhotoRecord) {
  const db = await getDB()
  await db.put('photos', photo)
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDB()
  return db.get('photos', id)
}

export async function getUnsyncedPhotos(): Promise<PhotoRecord[]> {
  const db = await getDB()
  return (await db.getAll('photos')).filter((p) => !p.synced)
}

export async function markPhotoSynced(id: string) {
  const db = await getDB()
  const cur = await db.get('photos', id)
  if (cur) await db.put('photos', { ...cur, synced: true })
}

export async function deletePhoto(id: string) {
  const db = await getDB()
  await db.delete('photos', id)
}

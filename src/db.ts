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
  dbPromise ??= openDB<HeadacheDB>('headache-app', 1, {
    upgrade(db) {
      const records = db.createObjectStore('records', { keyPath: 'id' })
      records.createIndex('by-ts', 'ts')
      db.createObjectStore('photos', { keyPath: 'id' })
    },
  })
  return dbPromise
}

export async function getAllRecords(): Promise<AppRecord[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('records', 'by-ts')
  return all.reverse()
}

export async function putRecord(record: AppRecord) {
  const db = await getDB()
  await db.put('records', record)
}

export async function deleteRecord(record: AppRecord) {
  const db = await getDB()
  await db.delete('records', record.id)
  if (record.type === 'medication' && record.photoId) {
    await db.delete('photos', record.photoId)
  }
}

export async function putPhoto(photo: PhotoRecord) {
  const db = await getDB()
  await db.put('photos', photo)
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDB()
  return db.get('photos', id)
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllRecords, putPhoto, putRecord, softDeleteRecord } from '../db.ts'
import { shouldLogPressure } from '../pressureLog.ts'
import type { AppRecord, HeadacheLevel, MedicationRecord } from '../types.ts'

export interface Snapshot {
  pressure: number | null
  lat: number | null
  lon: number | null
}

/** 新しく作る記録に共通の項目。ts は記録の日時、createdAt は実際に作った時刻 */
function stamps(ts: number) {
  const now = Date.now()
  return { id: crypto.randomUUID(), ts, createdAt: now, updatedAt: now, synced: false }
}

export function useRecords() {
  /** 削除済みを含む全記録。同期の対象 */
  const [all, setAll] = useState<AppRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    setAll(await getAllRecords())
    setLoaded(true)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  const records = useMemo(() => all.filter((r) => !r.deleted), [all])
  const unsyncedCount = useMemo(() => all.filter((r) => !r.synced).length, [all])

  const addHeadache = useCallback(
    async (level: HeadacheLevel, note: string, ts: number, snap: Snapshot) => {
      await putRecord({ ...stamps(ts), type: 'headache', level, note, ...snap })
      await reload()
    },
    [reload],
  )

  const addMedication = useCallback(
    async (name: string, tablets: number, note: string, photo: Blob | null, ts: number, snap: Snapshot) => {
      let photoId: string | null = null
      if (photo) {
        photoId = crypto.randomUUID()
        await putPhoto({ id: photoId, blob: photo, synced: false })
      }
      const record: MedicationRecord = {
        ...stamps(ts),
        type: 'medication',
        name,
        tablets,
        note,
        photoId,
        ...snap,
      }
      await putRecord(record)
      await reload()
    },
    [reload],
  )

  /** アプリを開いた時（画面に戻った時）の、その場所の気圧を記録する。二重記録だけ防ぐ */
  const logPressure = useCallback(
    async (snap: Snapshot) => {
      // 頭痛・服薬の記録に付いた気圧ではなく、開いた時の自動記録だけを見て、二重記録かどうか判断する
      const last = (await getAllRecords()).find((r) => !r.deleted && r.type === 'pressure')
      if (!shouldLogPressure(last?.ts ?? null, Date.now())) return
      await putRecord({ ...stamps(Date.now()), type: 'pressure', ...snap })
      await reload()
    },
    [reload],
  )

  const update = useCallback(
    async (record: AppRecord) => {
      await putRecord({ ...record, updatedAt: Date.now(), synced: false })
      await reload()
    },
    [reload],
  )

  /** 薬の名前を変えた時に、過去の服薬の記録の薬名も新しい名前にする（同期の対象にもなる） */
  const renameMedication = useCallback(
    async (oldName: string, newName: string) => {
      const now = Date.now()
      const targets = (await getAllRecords()).flatMap((r) =>
        r.type === 'medication' && !r.deleted && r.name === oldName ? [r] : [],
      )
      await Promise.all(targets.map((r) => putRecord({ ...r, name: newName, updatedAt: now, synced: false })))
      await reload()
    },
    [reload],
  )

  const remove = useCallback(
    async (record: AppRecord) => {
      await softDeleteRecord(record)
      await reload()
    },
    [reload],
  )

  return { records, loaded, unsyncedCount, reload, addHeadache, addMedication, logPressure, update, renameMedication, remove }
}

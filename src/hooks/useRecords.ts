import { useCallback, useEffect, useState } from 'react'
import { deleteRecord, getAllRecords, putPhoto, putRecord } from '../db.ts'
import type { AppRecord, HeadacheLevel, MedicationRecord } from '../types.ts'

export interface Snapshot {
  pressure: number | null
  lat: number | null
  lon: number | null
}

const PRESSURE_LOG_INTERVAL = 5 * 60_000

export function useRecords() {
  const [records, setRecords] = useState<AppRecord[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    setRecords(await getAllRecords())
    setLoaded(true)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  const addHeadache = useCallback(
    async (level: HeadacheLevel, note: string, ts: number, snap: Snapshot) => {
      await putRecord({
        id: crypto.randomUUID(),
        type: 'headache',
        ts,
        level,
        note,
        synced: false,
        ...snap,
      })
      await reload()
    },
    [reload],
  )

  const addMedication = useCallback(
    async (name: string, tablets: number, note: string, photo: Blob | null, snap: Snapshot) => {
      let photoId: string | null = null
      if (photo) {
        photoId = crypto.randomUUID()
        await putPhoto({ id: photoId, blob: photo, synced: false })
      }
      const record: MedicationRecord = {
        id: crypto.randomUUID(),
        type: 'medication',
        ts: Date.now(),
        name,
        tablets,
        note,
        photoId,
        synced: false,
        ...snap,
      }
      await putRecord(record)
      await reload()
    },
    [reload],
  )

  /** アプリを開いた時の気圧を記録する。短時間の連続記録は間引く */
  const logPressure = useCallback(
    async (snap: Snapshot) => {
      const last = (await getAllRecords()).find((r) => r.pressure !== null)
      if (last && Date.now() - last.ts < PRESSURE_LOG_INTERVAL) return
      await putRecord({
        id: crypto.randomUUID(),
        type: 'pressure',
        ts: Date.now(),
        synced: false,
        ...snap,
      })
      await reload()
    },
    [reload],
  )

  const update = useCallback(
    async (record: AppRecord) => {
      await putRecord(record)
      await reload()
    },
    [reload],
  )

  const remove = useCallback(
    async (record: AppRecord) => {
      await deleteRecord(record)
      await reload()
    },
    [reload],
  )

  return { records, loaded, addHeadache, addMedication, logPressure, update, remove }
}

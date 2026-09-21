import { useCallback, useMemo, useState } from 'react'
import {
  addMedicine,
  isMedicinesDirty,
  loadMedicines,
  moveMedicine,
  removeMedicine,
  saveMedicines,
  setMedicinesDirty,
  updateMedicine,
  visibleMedicines,
  type Medicine,
  type UpdateResult,
} from '../settings.ts'

export function useMedicines() {
  /** 削除済みを含む全部。同期の対象 */
  const [all, setAll] = useState<Medicine[]>(loadMedicines)
  /** ドライブにまだ反映していない変更があるか */
  const [dirty, setDirty] = useState(isMedicinesDirty)
  const medicines = useMemo(() => visibleMedicines(all), [all])

  /** この端末での変更を保存する。ドライブへの反映が必要な印も付ける */
  const persist = useCallback((next: Medicine[]) => {
    setAll(next)
    saveMedicines(next)
    setMedicinesDirty(true)
    setDirty(true)
  }, [])

  /** 同期で保存内容が変わった後に、画面の表示を保存内容に合わせ直す */
  const refresh = useCallback(() => {
    setAll(loadMedicines())
    setDirty(isMedicinesDirty())
  }, [])

  /** 追加できたら true。空欄・重複は false */
  const add = useCallback(
    (rawName: string): boolean => {
      const result = addMedicine(all, rawName, crypto.randomUUID())
      if (result.ok) persist(result.medicines)
      return result.ok
    },
    [all, persist],
  )

  /** 名前・色・服薬間隔を変える。名前を変えた時は、過去の記録の薬名も直せるよう、変更前後の名前を返す */
  const update = useCallback(
    (id: string, name: string, color: string, intervalHours: number | null): UpdateResult => {
      const result = updateMedicine(all, id, name, color, undefined, intervalHours)
      if (result.ok) persist(result.medicines)
      return result
    },
    [all, persist],
  )

  const remove = useCallback((id: string) => persist(removeMedicine(all, id)), [all, persist])

  /** 1つ上（-1）・下（1）へ動かす。端では何もしない */
  const move = useCallback(
    (id: string, direction: -1 | 1) => {
      const next = moveMedicine(all, id, direction)
      if (next !== all) persist(next)
    },
    [all, persist],
  )

  return { medicines, dirty, refresh, add, update, remove, move }
}

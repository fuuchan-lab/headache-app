import { useCallback, useState } from 'react'
import {
  addMedicine,
  loadMedicines,
  saveMedicines,
  updateMedicine,
  type Medicine,
  type UpdateResult,
} from '../settings.ts'

export function useMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>(loadMedicines)

  const persist = useCallback((next: Medicine[]) => {
    setMedicines(next)
    saveMedicines(next)
  }, [])

  /** 追加できたら true。空欄・重複は false */
  const add = useCallback(
    (rawName: string): boolean => {
      const result = addMedicine(medicines, rawName, crypto.randomUUID())
      if (result.ok) persist(result.medicines)
      return result.ok
    },
    [medicines, persist],
  )

  /** 名前と色を変える。名前を変えた時は、過去の記録の薬名も直せるよう、変更前後の名前を返す */
  const update = useCallback(
    (id: string, name: string, color: string): UpdateResult => {
      const result = updateMedicine(medicines, id, name, color)
      if (result.ok) persist(result.medicines)
      return result
    },
    [medicines, persist],
  )

  const remove = useCallback(
    (id: string) => persist(medicines.filter((m) => m.id !== id)),
    [medicines, persist],
  )

  return { medicines, add, update, remove }
}

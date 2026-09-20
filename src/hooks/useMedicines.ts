import { useCallback, useState } from 'react'
import { loadMedicines, nextColor, saveMedicines, type Medicine } from '../settings.ts'

export function useMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>(loadMedicines)

  const update = useCallback((next: Medicine[]) => {
    setMedicines(next)
    saveMedicines(next)
  }, [])

  /** 追加できたら true。空欄・重複は false */
  const add = useCallback(
    (rawName: string): boolean => {
      const name = rawName.trim()
      if (!name || medicines.some((m) => m.name === name)) return false
      update([...medicines, { id: crypto.randomUUID(), name, color: nextColor(medicines) }])
      return true
    },
    [medicines, update],
  )

  const remove = useCallback(
    (id: string) => update(medicines.filter((m) => m.id !== id)),
    [medicines, update],
  )

  return { medicines, add, remove }
}

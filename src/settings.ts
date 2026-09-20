import { DEFAULT_MEDICINE_NAMES, canonicalMedicineName } from './medicineNames.ts'

export interface Medicine {
  id: string
  /** 保存している名前。初期の薬は日本語名（画面には言語に合わせた名前を出す） */
  name: string
  /** グラフの錠剤アイコンの色 */
  color: string
}

/** 設定にない薬（自由入力）の色 */
export const OTHER_COLOR = '#6b7280'

/** 薬に選べる色（グラフの錠剤アイコンの色） */
export const MEDICINE_COLORS = ['#7c3aed', '#db2777', '#ea580c', '#0284c7', '#65a30d', '#0d9488', '#a16207', '#4f46e5']

export const DEFAULT_MEDICINES: Medicine[] = DEFAULT_MEDICINE_NAMES.map((n, i) => ({
  id: `default-${i}`,
  name: n.ja,
  color: MEDICINE_COLORS[i],
}))

/** 服薬時に選べる錠数 */
export const TABLET_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6]

const STORAGE_KEY = 'medicines'

export function loadMedicines(): Medicine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Medicine[]
  } catch {
    // 読めない場合は初期値を使う
  }
  return DEFAULT_MEDICINES
}

export function saveMedicines(medicines: Medicine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines))
  } catch {
    // 保存できなくても、その回の操作は画面に反映される
  }
}

/** まだ使われていない色を優先して選ぶ */
export function nextColor(medicines: Medicine[]): string {
  const used = new Set(medicines.map((m) => m.color))
  return MEDICINE_COLORS.find((c) => !used.has(c)) ?? MEDICINE_COLORS[medicines.length % MEDICINE_COLORS.length]
}

export function colorFor(medicines: Medicine[], name: string): string {
  return medicines.find((m) => m.name === name)?.color ?? OTHER_COLOR
}

/** 薬を追加した結果。名前が空、または同じ名前がすでにあれば追加しない */
export type AddResult = { ok: true; medicines: Medicine[] } | { ok: false; reason: 'empty' | 'duplicate' }

export function addMedicine(list: Medicine[], rawName: string, id: string): AddResult {
  const name = canonicalMedicineName(rawName)
  if (!name) return { ok: false, reason: 'empty' }
  if (list.some((m) => m.name === name)) return { ok: false, reason: 'duplicate' }
  return { ok: true, medicines: [...list, { id, name, color: nextColor(list) }] }
}

/** 薬を編集した結果。oldName / newName が違えば、過去の記録の薬名も直す必要がある */
export type UpdateResult =
  | { ok: true; medicines: Medicine[]; oldName: string; newName: string }
  | { ok: false; reason: 'empty' | 'duplicate' | 'missing' }

/** 薬の名前と色を変える。初期の薬でも、登録した薬でも同じように編集できる */
export function updateMedicine(list: Medicine[], id: string, rawName: string, color: string): UpdateResult {
  const newName = canonicalMedicineName(rawName)
  if (!newName) return { ok: false, reason: 'empty' }
  const current = list.find((m) => m.id === id)
  if (!current) return { ok: false, reason: 'missing' }
  if (list.some((m) => m.id !== id && m.name === newName)) return { ok: false, reason: 'duplicate' }
  return {
    ok: true,
    medicines: list.map((m) => (m.id === id ? { ...m, name: newName, color } : m)),
    oldName: current.name,
    newName,
  }
}

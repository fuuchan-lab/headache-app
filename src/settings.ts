import { DEFAULT_MEDICINE_NAMES, canonicalMedicineName } from './medicineNames.ts'

export interface Medicine {
  id: string
  /** 保存している名前。初期の薬は日本語名（画面には言語に合わせた名前を出す） */
  name: string
  /** グラフの錠剤アイコンの色 */
  color: string
  /** 作成時刻 (epoch ms)。並び順に使う。初期の薬は 0, 1, 2 */
  createdAt: number
  /** 最終更新時刻 (epoch ms)。端末間で新しい方を採用するために使う。初期の状態は 0 */
  updatedAt: number
  /** 削除済み。他の端末へ削除を伝えるため、薬自体は残す */
  deleted?: boolean
}

/** 設定にない薬（自由入力）の色 */
export const OTHER_COLOR = '#6b7280'

/** 薬に選べる色（グラフの錠剤アイコンの色） */
export const MEDICINE_COLORS = ['#7c3aed', '#db2777', '#ea580c', '#0284c7', '#65a30d', '#0d9488', '#a16207', '#4f46e5']

export const DEFAULT_MEDICINES: Medicine[] = DEFAULT_MEDICINE_NAMES.map((n, i) => ({
  id: `default-${i}`,
  name: n.ja,
  color: MEDICINE_COLORS[i],
  createdAt: i,
  updatedAt: 0,
}))

/** 服薬時に選べる錠数 */
export const TABLET_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6]

const STORAGE_KEY = 'medicines'
const DIRTY_KEY = 'medicines-dirty'

/** 古い形式（createdAt・updatedAt がない）で保存されていた薬にも、それらを補う */
function normalize(list: Partial<Medicine>[]): Medicine[] {
  return list.map((m, i) => ({
    id: String(m.id),
    name: String(m.name),
    color: String(m.color),
    createdAt: m.createdAt ?? i,
    updatedAt: m.updatedAt ?? 0,
    ...(m.deleted ? { deleted: true } : {}),
  }))
}

/** 削除済みを含む、保存している薬すべて。同期の対象 */
export function loadMedicines(): Medicine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalize(JSON.parse(raw) as Partial<Medicine>[])
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

/** ドライブにまだ反映していない変更があるか */
export function isMedicinesDirty(): boolean {
  try {
    return localStorage.getItem(DIRTY_KEY) === '1'
  } catch {
    return false
  }
}

export function setMedicinesDirty(dirty: boolean) {
  try {
    if (dirty) localStorage.setItem(DIRTY_KEY, '1')
    else localStorage.removeItem(DIRTY_KEY)
  } catch {
    // 保存できなくても、次の同期で確認される
  }
}

/** 画面に出す薬（削除済みを除く） */
export function visibleMedicines(list: Medicine[]): Medicine[] {
  return list.filter((m) => !m.deleted)
}

/** まだ使われていない色を優先して選ぶ */
export function nextColor(medicines: Medicine[]): string {
  const live = visibleMedicines(medicines)
  const used = new Set(live.map((m) => m.color))
  return MEDICINE_COLORS.find((c) => !used.has(c)) ?? MEDICINE_COLORS[live.length % MEDICINE_COLORS.length]
}

export function colorFor(medicines: Medicine[], name: string): string {
  return visibleMedicines(medicines).find((m) => m.name === name)?.color ?? OTHER_COLOR
}

/** 薬を追加した結果。名前が空、または同じ名前がすでにあれば追加しない */
export type AddResult = { ok: true; medicines: Medicine[] } | { ok: false; reason: 'empty' | 'duplicate' }

export function addMedicine(list: Medicine[], rawName: string, id: string, now = Date.now()): AddResult {
  const name = canonicalMedicineName(rawName)
  if (!name) return { ok: false, reason: 'empty' }
  if (visibleMedicines(list).some((m) => m.name === name)) return { ok: false, reason: 'duplicate' }
  return { ok: true, medicines: [...list, { id, name, color: nextColor(list), createdAt: now, updatedAt: now }] }
}

/** 薬を編集した結果。oldName / newName が違えば、過去の記録の薬名も直す必要がある */
export type UpdateResult =
  | { ok: true; medicines: Medicine[]; oldName: string; newName: string }
  | { ok: false; reason: 'empty' | 'duplicate' | 'missing' }

/** 薬の名前と色を変える。初期の薬でも、登録した薬でも同じように編集できる */
export function updateMedicine(
  list: Medicine[],
  id: string,
  rawName: string,
  color: string,
  now = Date.now(),
): UpdateResult {
  const newName = canonicalMedicineName(rawName)
  if (!newName) return { ok: false, reason: 'empty' }
  const current = visibleMedicines(list).find((m) => m.id === id)
  if (!current) return { ok: false, reason: 'missing' }
  if (visibleMedicines(list).some((m) => m.id !== id && m.name === newName)) return { ok: false, reason: 'duplicate' }
  return {
    ok: true,
    medicines: list.map((m) => (m.id === id ? { ...m, name: newName, color, updatedAt: now } : m)),
    oldName: current.name,
    newName,
  }
}

/** 薬を削除する。他の端末にも削除が伝わるよう、印を付けて残す */
export function removeMedicine(list: Medicine[], id: string, now = Date.now()): Medicine[] {
  return list.map((m) => (m.id === id ? { ...m, deleted: true, updatedAt: now } : m))
}

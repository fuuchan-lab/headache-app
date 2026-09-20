export interface Medicine {
  id: string
  name: string
  /** グラフの錠剤アイコンの色 */
  color: string
}

/** 設定にない薬（自由入力）の色 */
export const OTHER_COLOR = '#6b7280'

const PALETTE = ['#7c3aed', '#db2777', '#ea580c', '#0284c7', '#65a30d', '#0d9488', '#a16207', '#4f46e5']

const DEFAULT_NAMES = ['ロキソニン', 'カロナール', 'バファリン']

export const DEFAULT_MEDICINES: Medicine[] = DEFAULT_NAMES.map((name, i) => ({
  id: `default-${i}`,
  name,
  color: PALETTE[i],
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
  return PALETTE.find((c) => !used.has(c)) ?? PALETTE[medicines.length % PALETTE.length]
}

export function colorFor(medicines: Medicine[], name: string): string {
  return medicines.find((m) => m.name === name)?.color ?? OTHER_COLOR
}

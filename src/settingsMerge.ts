/** 薬の設定を、端末とドライブの間で合わせる処理。ブラウザ機能に依存しない */
import type { Medicine } from './settings.ts'

/** 並び順: 作成時刻、同じなら ID。どの端末で合わせても同じ順になる（順番の違いで何度も上書きし合わないため） */
const byOrder = (a: Medicine, b: Medicine) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** 比べる時に使う、内容を一意に表す文字列 */
const fingerprint = (m: Medicine) => JSON.stringify([m.id, m.name, m.color, m.createdAt, m.updatedAt, !!m.deleted])

/** 同じ更新時刻で内容が違う時も、どの端末でも同じ方を選べるようにする */
function pick(a: Medicine, b: Medicine): Medicine {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b
  return fingerprint(a) >= fingerprint(b) ? a : b
}

/**
 * 端末とドライブの薬を合わせる。同じ薬（ID）は更新時刻の新しい方を採用し、片方にしかない薬は加える。
 * 2台で同じ名前の薬を別々に追加した場合は、作成の早い方だけ残す。
 */
export function mergeMedicines(local: Medicine[], remote: Medicine[]): Medicine[] {
  const byId = new Map<string, Medicine>()
  for (const m of [...local, ...remote]) {
    const cur = byId.get(m.id)
    byId.set(m.id, cur ? pick(cur, m) : m)
  }
  const all = [...byId.values()].sort(byOrder)

  // 同じ名前の薬が複数ある時は、先頭（作成が早い方）だけ残し、他は削除済みにする
  const seen = new Map<string, Medicine>()
  return all.map((m) => {
    if (m.deleted) return m
    const first = seen.get(m.name)
    if (!first) {
      seen.set(m.name, m)
      return m
    }
    // 削除の時刻は、どの端末でも同じ値になるよう、2つの更新時刻の大きい方にする
    return { ...m, deleted: true, updatedAt: Math.max(m.updatedAt, first.updatedAt) }
  })
}

/** 2つの薬の一覧が、同じ内容か（並び順も含めて） */
export function sameMedicines(a: Medicine[], b: Medicine[]): boolean {
  return a.length === b.length && a.every((m, i) => fingerprint(m) === fingerprint(b[i]))
}

export function serializeSettings(medicines: Medicine[]): string {
  return JSON.stringify({ version: 1, medicines })
}

/** ドライブの settings.json を読み込む。壊れた行は捨て、ファイル全体が不正なら例外にする */
export function parseSettings(text: string): Medicine[] {
  const data = JSON.parse(text) as { medicines?: unknown }
  if (!data || !Array.isArray(data.medicines)) throw new Error('invalid-settings-file')
  return data.medicines.flatMap((raw): Medicine[] => {
    const m = raw as Partial<Medicine> | null
    if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || typeof m.color !== 'string') return []
    return [
      {
        id: m.id,
        name: m.name,
        color: m.color,
        createdAt: typeof m.createdAt === 'number' ? m.createdAt : 0,
        updatedAt: typeof m.updatedAt === 'number' ? m.updatedAt : 0,
        ...(m.deleted ? { deleted: true } : {}),
      },
    ]
  })
}

export interface SettingsSyncPlan {
  /** 合わせた結果 */
  merged: Medicine[]
  /** この端末の保存内容を、合わせた結果に更新するか */
  saveLocal: boolean
  /** ドライブの settings.json を、合わせた結果で更新（または新規作成）するか */
  upload: boolean
}

/**
 * 同期で何をするかを決める。
 * @param remote 今回ドライブから読み込んだ内容。前回から変わっていなくて読み込まなかった時は null
 * @param fileExists ドライブに settings.json があるか
 * @param dirty この端末に、まだドライブへ送っていない変更があるか
 */
export function planSettingsSync(
  local: Medicine[],
  remote: Medicine[] | null,
  fileExists: boolean,
  dirty: boolean,
): SettingsSyncPlan {
  // 読み込まなかった場合も、重複や並び順を整えるために自分自身と合わせる
  const merged = mergeMedicines(local, remote ?? [])
  return {
    merged,
    saveLocal: !sameMedicines(merged, local),
    upload: !fileExists || dirty || (remote !== null && !sameMedicines(merged, mergeMedicines(remote, []))),
  }
}

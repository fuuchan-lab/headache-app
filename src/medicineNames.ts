/** 初期の薬の名前。ブラウザ機能に依存しない */
import type { Lang } from './i18n/context.ts'

/**
 * 初期の薬（日本語名 / 英語名）。
 * 記録には日本語名で保存し、画面やExcelに出す時に言語に合わせて切り替える。
 * こうしておけば、言語を切り替えても同じ薬として集計・色分けされ、これまでの記録もそのまま使える。
 */
export const DEFAULT_MEDICINE_NAMES: readonly Record<Lang, string>[] = [
  { ja: 'ロキソニン', en: 'Loxonin' },
  { ja: 'カロナール', en: 'Calonal' },
  { ja: 'バファリン', en: 'Bufferin' },
]

const norm = (s: string) => s.trim().toLowerCase()

function findDefault(name: string) {
  const n = norm(name)
  return DEFAULT_MEDICINE_NAMES.find((d) => norm(d.ja) === n || norm(d.en) === n)
}

/** 表示用の名前。初期の薬なら、日本語名・英語名のどちらで保存されていても、指定の言語の名前にする */
export function localizeMedicineName(name: string, lang: Lang): string {
  return findDefault(name)?.[lang] ?? name
}

/** 保存用の名前。初期の薬の英語名（Loxonin など）は日本語名に揃え、それ以外は前後の空白だけ取る */
export function canonicalMedicineName(name: string): string {
  const trimmed = name.trim()
  return findDefault(trimmed)?.ja ?? trimmed
}

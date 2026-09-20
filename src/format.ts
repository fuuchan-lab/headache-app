import { LOCALES, type Lang, type TFn } from './i18n/context.ts'
import type { HeadacheRecord, MedicationRecord } from './types.ts'

export function formatElapsed(ms: number, t: TFn): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h === 0 ? t('elapsed.m', { m }) : t('elapsed.hm', { h, m })
}

/** 錠数の表示。英語では 1 だけ単数形にする */
export function tabletsLabel(n: number, t: TFn): string {
  return n === 1 ? t('tablets.one', { n }) : t('tablets.other', { n })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** epoch ms → <input type="datetime-local"> の値 (端末のローカル時刻) */
export function toLocalInput(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> の値 → epoch ms。不正な値は null */
export function fromLocalInput(value: string): number | null {
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function formatDateTime(ts: number, lang: Lang): string {
  return new Date(ts).toLocaleString(LOCALES[lang], {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 記録の見出し。頭痛なら「頭痛 3（痛い）」、服薬なら「ロキソニン 1錠」 */
export function recordTitle(r: HeadacheRecord | MedicationRecord, t: TFn): string {
  if (r.type === 'headache') return t('history.headache', { level: r.level, label: t(`level.${r.level}`) })
  return r.tablets === undefined ? r.name : `${r.name} ${tabletsLabel(r.tablets, t)}`
}

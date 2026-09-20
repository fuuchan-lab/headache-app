import { useI18n } from '../i18n/useI18n.ts'

interface Props {
  size?: number
  /** グラフ (SVG) の中に置く時の位置 */
  x?: number
  y?: number
}

/** 付箋のアイコン。右下が折れた黄色いメモ */
export function StickyIcon({ size = 18, x, y }: Props) {
  const { t } = useI18n()
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={t('common.note')}>
      <path d="M3 3h18v12l-6 6H3z" fill="#fde047" stroke="#a16207" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M21 15h-6v6" fill="#facc15" stroke="#a16207" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 8h10M7 12h6" stroke="#a16207" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

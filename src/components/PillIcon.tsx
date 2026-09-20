import { useI18n } from '../i18n/useI18n.ts'

interface Props {
  color: string
  size?: number
  /** 半錠。カプセルを半分に割った形で描く */
  half?: boolean
  /** グラフ (SVG) の中に置く時の位置 */
  x?: number
  y?: number
}

/** 斜めのカプセル型の錠剤アイコン。半分だけ薬ごとの色で塗る（半錠は色の付いた側だけ） */
export function PillIcon({ color, size = 18, half = false, x, y }: Props) {
  const { t } = useI18n()
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={t('meds.icon')}>
      {half ? (
        // 割った断面が平らな半分のカプセル。カプセルの軸方向に寄せて、アイコンの中心に置く
        <g transform="rotate(-45 12 12) translate(5 0)">
          <path
            d="M12 7 h-5 a5 5 0 0 0 0 10 h5 z"
            fill={color}
            stroke={color}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <g transform="rotate(-45 12 12)">
          <rect x="2" y="7" width="20" height="10" rx="5" fill="#ffffff" />
          <path d="M7 7 h5 v10 h-5 a5 5 0 0 1 0 -10 z" fill={color} />
          <rect x="2" y="7" width="20" height="10" rx="5" fill="none" stroke={color} strokeWidth="1.6" />
        </g>
      )}
    </svg>
  )
}

interface Props {
  color: string
  size?: number
  /** グラフ (SVG) の中に置く時の位置 */
  x?: number
  y?: number
}

/** 斜めのカプセル型の錠剤アイコン。半分だけ薬ごとの色で塗る */
export function PillIcon({ color, size = 18, x, y }: Props) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="薬">
      <g transform="rotate(-45 12 12)">
        <rect x="2" y="7" width="20" height="10" rx="5" fill="#ffffff" />
        <path d="M7 7 h5 v10 h-5 a5 5 0 0 1 0 -10 z" fill={color} />
        <rect x="2" y="7" width="20" height="10" rx="5" fill="none" stroke={color} strokeWidth="1.6" />
      </g>
    </svg>
  )
}

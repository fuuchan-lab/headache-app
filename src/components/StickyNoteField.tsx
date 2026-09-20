interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 画面上のラベルがない場所で読み上げ用に付ける名前 */
  label?: string
}

/** 付箋のような見た目の、複数行のメモ欄 */
export function StickyNoteField({ value, onChange, placeholder, label = 'メモ' }: Props) {
  return (
    <textarea
      className="sticky"
      rows={2}
      maxLength={500}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

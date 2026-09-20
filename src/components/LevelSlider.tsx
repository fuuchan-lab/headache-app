import { LEVEL_COLORS, LEVEL_LABELS, type HeadacheLevel } from '../types.ts'

interface Props {
  value: HeadacheLevel
  /** スライダーを動かした・指を離した時に呼ばれる（同じ値でも呼ばれる） */
  onChange: (level: HeadacheLevel) => void
  /** まだ選択されていない状態（記録前）の表示にする */
  untouched?: boolean
}

const LEVELS: HeadacheLevel[] = [0, 1, 2, 3, 4, 5]

export function LevelSlider({ value, onChange, untouched = false }: Props) {
  const emit = (el: HTMLInputElement) => onChange(Number(el.value) as HeadacheLevel)

  return (
    <div className="slider" style={{ '--c': LEVEL_COLORS[value] } as React.CSSProperties}>
      <p className={`slider-value ${untouched ? 'untouched' : ''}`}>
        <span className="slider-num">{untouched ? '–' : value}</span>
        <span className="slider-label">{untouched ? 'スライダーを動かして選択' : LEVEL_LABELS[value]}</span>
      </p>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={value}
        aria-label="頭痛の度合い（0〜5）"
        aria-valuetext={LEVEL_LABELS[value]}
        onChange={(e) => emit(e.currentTarget)}
        // 0 のまま選びたい場合など、値が変わらなくても「選択した」ことを伝える
        onPointerUp={(e) => emit(e.currentTarget)}
      />
      <div className="slider-ticks" aria-hidden="true">
        {LEVELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  )
}

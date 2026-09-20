import { useI18n } from '../i18n/useI18n.ts'
import { LEVEL_COLORS, type HeadacheLevel } from '../types.ts'

interface Props {
  value: HeadacheLevel
  /** スライダーを動かした・指を離した時に呼ばれる（同じ値でも呼ばれる） */
  onChange: (level: HeadacheLevel) => void
  /** まだ選択されていない状態（記録前）の表示にする */
  untouched?: boolean
}

const LEVELS: HeadacheLevel[] = [0, 1, 2, 3, 4, 5]

export function LevelSlider({ value, onChange, untouched = false }: Props) {
  const { t } = useI18n()
  const emit = (el: HTMLInputElement) => onChange(Number(el.value) as HeadacheLevel)
  const label = t(`level.${value}`)

  return (
    <div className="slider" style={{ '--c': LEVEL_COLORS[value] } as React.CSSProperties}>
      <p className={`slider-value ${untouched ? 'untouched' : ''}`}>
        <span className="slider-num">{untouched ? '–' : value}</span>
        <span className="slider-label">{untouched ? t('slider.prompt') : label}</span>
      </p>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={value}
        aria-label={t('slider.aria')}
        aria-valuetext={label}
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

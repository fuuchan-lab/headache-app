import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  DAY,
  HOUR,
  MIN_SPAN,
  autoWindow,
  chooseTicks,
  clampWindow,
  coversAll,
  zoomWindow,
  type TimeWindow,
} from '../chartView.ts'
import { recordTitle } from '../format.ts'
import { useChartGestures } from '../hooks/useChartGestures.ts'
import { LOCALES } from '../i18n/context.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { localizeMedicineName } from '../medicineNames.ts'
import { colorFor, type Medicine } from '../settings.ts'
import { LEVEL_COLORS, type AppRecord, type HeadacheLevel } from '../types.ts'
import { PillIcon } from './PillIcon.tsx'
import { RecordPopup } from './RecordPopup.tsx'
import { StickyIcon } from './StickyIcon.tsx'

/** 表示範囲のプリセット（時間）。「全体」は記録全体に自動で合わせる */
const PRESET_HOURS = [6, 24, 72, 168, 720]
/** ＋/－ボタン1回の拡大・縮小の倍率 */
const ZOOM_STEP = 2
const ICON_SIZE = 20
/** 錠剤アイコンを重ねる時の横のずらし幅 (px) */
const PILL_OVERLAP = 8
/** 横軸の線から、錠剤アイコン・付箋アイコンまでの距離 (px) */
const PILL_ABOVE_AXIS = ICON_SIZE / 2 + 2
const NOTE_BELOW_AXIS = ICON_SIZE / 2 + 4
/** 指で押しやすいよう、見た目より広くする当たり判定の半径 (px) */
const HIT_RADIUS = 18

interface Point {
  t: number
  /** 頭痛の記録の点だけが持つ。タップで詳細を開くために使う */
  id?: string
  pressure?: number
  level?: number
}

interface MedMark {
  id: string
  t: number
  name: string
  color: string
  /** まるごとの錠剤アイコンの数（2錠なら2つ） */
  whole: number
  /** 0.5錠の端数があれば、半分のアイコンを最後に1つ足す */
  half: boolean
}

interface NoteMark {
  id: string
  t: number
  title: string
}

/** 錠数を、まるごとのアイコン数と半分のアイコン有無にする（重ねるのは最大6つ） */
function pillCounts(tablets: number): { whole: number; half: boolean } {
  const half = tablets - Math.floor(tablets) >= 0.5
  const whole = Math.min(Math.floor(tablets), half ? 5 : 6)
  return { whole: whole === 0 && !half ? 1 : whole, half }
}

interface LevelDotProps {
  cx?: number
  cy?: number
  payload?: Point
  onOpen: (id: string) => void
  label: (level: HeadacheLevel) => string
}

/** 頭痛レベルの点。レベルに応じた色で描き、タップで記録の詳細を開く（気圧だけの点では描かない） */
function LevelDot({ cx, cy, payload, onOpen, label }: LevelDotProps) {
  if (cx === undefined || cy === undefined || payload?.level === undefined || !payload.id) return null
  const id = payload.id
  const level = payload.level as HeadacheLevel
  return (
    <g role="button" aria-label={label(level)} style={{ cursor: 'pointer' }} onClick={() => onOpen(id)}>
      <circle cx={cx} cy={cy} r={HIT_RADIUS} fill="transparent" />
      <circle cx={cx} cy={cy} r={5} fill={LEVEL_COLORS[level]} stroke="#ffffff" strokeWidth={1.5} />
    </g>
  )
}

/** 表示中: null は「全体」（記録の量に合わせて自動）、それ以外は拡大・移動した範囲 */
type View = { window: TimeWindow; hours: number | null } | null

export function PressureChart({ records, medicines }: { records: AppRecord[]; medicines: Medicine[] }) {
  const { t, lang } = useI18n()
  const [view, setView] = useState<View>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  // 記録の時刻すべてが収まる範囲。記録が増えれば、この範囲も自動で広がる
  const auto = useMemo(
    () => autoWindow(records.filter((r) => r.type !== 'pressure' || r.pressure !== null).map((r) => r.ts)),
    [records],
  )
  const win = view ? clampWindow(view.window, auto) : auto
  const spanMs = win.to - win.from

  const applyWindow = (w: TimeWindow, hours: number | null = null) =>
    setView(coversAll(w, auto) ? null : { window: w, hours })
  const zoomBy = (factor: number) => applyWindow(zoomWindow(win, factor, 0.5, auto))

  const { setContainer, handlers } = useChartGestures({ window: win, limits: auto, onChange: (w) => applyWindow(w) })

  const { points, meds, notes, pressureDomain } = useMemo(() => {
    // 端の線が途切れないよう、範囲の外側も半分の幅だけ含める
    const margin = (win.to - win.from) / 2
    const near = records.filter((r) => r.ts >= win.from - margin && r.ts <= win.to + margin).sort((a, b) => a.ts - b.ts)
    const visible = near.filter((r) => r.ts >= win.from && r.ts <= win.to)
    const points: Point[] = near.flatMap((r): Point[] => {
      if (r.type === 'headache') return [{ t: r.ts, id: r.id, level: r.level, pressure: r.pressure ?? undefined }]
      if (r.type === 'pressure' && r.pressure !== null) return [{ t: r.ts, pressure: r.pressure }]
      return []
    })
    const meds: MedMark[] = visible.flatMap((r): MedMark[] =>
      r.type === 'medication'
        ? [{ id: r.id, t: r.ts, name: r.name, color: colorFor(medicines, r.name), ...pillCounts(r.tablets ?? 1) }]
        : [],
    )
    // メモのある記録には付箋マークを付ける
    const notes: NoteMark[] = visible.flatMap((r): NoteMark[] =>
      r.type !== 'pressure' && r.note ? [{ id: r.id, t: r.ts, title: recordTitle(r, t, lang) }] : [],
    )
    // アイコンを軸の位置に置くため、気圧軸の範囲は自分で計算する（見えている範囲の気圧に合わせる）
    const inView = (visible.length > 0 ? visible : near).flatMap((r) => (r.pressure !== null ? [r.pressure] : []))
    const pressureDomain: [number, number] = inView.length
      ? [Math.floor(Math.min(...inView)) - 2, Math.ceil(Math.max(...inView)) + 2]
      : [990, 1030]
    return { points, meds, notes, pressureDomain }
  }, [records, medicines, win.from, win.to, t, lang])

  const usedMeds = useMemo(() => {
    const seen = new Map<string, string>()
    for (const m of meds) seen.set(m.name, m.color)
    return [...seen]
  }, [meds])

  const opened = openId ? records.find((r) => r.id === openId) : undefined
  const ticks = useMemo(() => chooseTicks(win), [win])

  if (records.filter((r) => r.type === 'headache' || r.pressure !== null).length < 2) {
    return (
      <section className="card">
        <h2>{t('chart.title')}</h2>
        <p className="muted">{t('chart.empty')}</p>
      </section>
    )
  }

  const pressureName = t('chart.pressure')
  // 軸の線の位置（ここを基準に、錠剤は少し上・付箋は少し下へずらして描く）
  const axisY = pressureDomain[0] + 0.01
  const titleOf = (id: string) => {
    const r = records.find((x) => x.id === id)
    return r && r.type !== 'pressure' ? recordTitle(r, t, lang) : ''
  }
  const tickLabel = (v: number) => {
    const d = new Date(v)
    const date = `${d.getMonth() + 1}/${d.getDate()}`
    if (ticks.unit === 'hour') return d.getHours() === 0 ? date : t('chart.hour', { h: d.getHours() })
    // 1年近く以上の長い期間は、年も付ける
    return spanMs > 300 * DAY ? `${String(d.getFullYear()).slice(2)}/${date}` : date
  }

  return (
    <section className="card">
      <div className="row">
        <h2>{t('chart.title')}</h2>
        <div className="zoom">
          <button aria-label={t('chart.zoomOut')} title={t('chart.zoomOut')} disabled={view === null} onClick={() => zoomBy(1 / ZOOM_STEP)}>
            －
          </button>
          <button aria-label={t('chart.zoomIn')} title={t('chart.zoomIn')} disabled={spanMs <= MIN_SPAN} onClick={() => zoomBy(ZOOM_STEP)}>
            ＋
          </button>
        </div>
      </div>
      <div className="seg">
        <button className={view === null ? 'on' : ''} onClick={() => setView(null)}>
          {t('chart.all')}
        </button>
        {PRESET_HOURS.map((h) => (
          <button
            key={h}
            className={view?.hours === h ? 'on' : ''}
            onClick={() => applyWindow({ from: auto.to - h * HOUR, to: auto.to }, h)}
          >
            {h < 24 ? t('chart.hours', { n: h }) : t('chart.days', { n: h / 24 })}
          </button>
        ))}
      </div>
      <div className="chart" ref={setContainer} {...handlers}>
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={points} margin={{ top: 8, right: 0, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[win.from, win.to]}
              allowDataOverflow
              ticks={ticks.values}
              tickFormatter={tickLabel}
              tick={{ fontSize: 11 }}
              // 軸の線と目盛りの文字の間に、付箋アイコンを置く余白をつくる
              height={50}
              tickMargin={26}
            />
            <YAxis yAxisId="p" domain={pressureDomain} allowDataOverflow tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="l"
              orientation="right"
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={{ fontSize: 11 }}
              width={24}
            />
            <Tooltip
              labelFormatter={(v) => new Date(v as number).toLocaleString(LOCALES[lang])}
              formatter={(v, name) => (name === pressureName ? [`${Number(v).toFixed(1)} hPa`, name] : [String(v), name])}
            />
            {meds.map((m) => (
              <ReferenceLine key={m.id} yAxisId="p" x={m.t} stroke={m.color} strokeDasharray="4 3" strokeOpacity={0.7} />
            ))}
            <Line
              yAxisId="p"
              dataKey="pressure"
              name={pressureName}
              stroke="#0f766e"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              yAxisId="l"
              dataKey="level"
              name={t('chart.headache')}
              stroke="#dc2626"
              strokeWidth={2}
              connectNulls
              dot={
                <LevelDot
                  onOpen={setOpenId}
                  label={(level) =>
                    t('chart.openRecord', { title: t('history.headache', { level, label: t(`level.${level}`) }) })
                  }
                />
              }
              activeDot={false}
              isAnimationActive={false}
            />
            {meds.map((m) => (
              <ReferenceDot
                key={m.id}
                yAxisId="p"
                x={m.t}
                y={axisY}
                shape={({ cx, cy }) => {
                  const total = m.whole + (m.half ? 1 : 0)
                  const centerY = (cy ?? 0) - PILL_ABOVE_AXIS
                  const hitHalfWidth = Math.max(((total - 1) * PILL_OVERLAP) / 2 + ICON_SIZE / 2, HIT_RADIUS)
                  return (
                    <g
                      role="button"
                      aria-label={t('chart.openRecord', { title: titleOf(m.id) })}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpenId(m.id)}
                    >
                      {/* 重ねた錠剤アイコン全体を覆う当たり判定 */}
                      <rect
                        x={(cx ?? 0) - hitHalfWidth}
                        y={centerY - HIT_RADIUS}
                        width={hitHalfWidth * 2}
                        height={HIT_RADIUS * 2}
                        fill="transparent"
                      />
                      {Array.from({ length: total }, (_, i) => (
                        <PillIcon
                          key={i}
                          color={m.color}
                          size={ICON_SIZE}
                          half={m.half && i === total - 1}
                          x={(cx ?? 0) - ICON_SIZE / 2 + (i - (total - 1) / 2) * PILL_OVERLAP}
                          y={centerY - ICON_SIZE / 2}
                        />
                      ))}
                    </g>
                  )
                }}
              />
            ))}
            {notes.map((n) => (
              <ReferenceDot
                key={n.id}
                yAxisId="p"
                x={n.t}
                y={axisY}
                shape={({ cx, cy }) => {
                  const centerY = (cy ?? 0) + NOTE_BELOW_AXIS
                  return (
                    <g
                      role="button"
                      aria-label={t('chart.openNote', { title: n.title })}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpenId(n.id)}
                    >
                      <circle cx={cx} cy={centerY} r={HIT_RADIUS} fill="transparent" />
                      <StickyIcon size={ICON_SIZE} x={(cx ?? 0) - ICON_SIZE / 2} y={centerY - ICON_SIZE / 2} />
                    </g>
                  )
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="muted small">{t('chart.zoomHint')}</p>
      <ul className="legend">
        <li>
          <span className="swatch" style={{ background: '#0f766e' }} />
          {t('chart.legendPressure')}
        </li>
        <li>
          <span className="swatch" style={{ background: '#dc2626' }} />
          {t('chart.legendHeadache')}
        </li>
        {usedMeds.map(([name, color]) => (
          <li key={name}>
            <PillIcon color={color} size={16} />
            {localizeMedicineName(name, lang)}
          </li>
        ))}
        {notes.length > 0 && (
          <li>
            <StickyIcon size={16} />
            {t('chart.legendNote')}
          </li>
        )}
      </ul>
      {opened && opened.type !== 'pressure' && (
        <RecordPopup record={opened} medicines={medicines} onClose={() => setOpenId(null)} />
      )}
    </section>
  )
}

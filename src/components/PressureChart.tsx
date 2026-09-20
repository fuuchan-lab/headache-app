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
import { colorFor, type Medicine } from '../settings.ts'
import { LEVEL_COLORS, LEVEL_LABELS, type AppRecord, type HeadacheLevel } from '../types.ts'
import { NotePopup, type NoteMark } from './NotePopup.tsx'
import { PillIcon } from './PillIcon.tsx'
import { StickyIcon } from './StickyIcon.tsx'

const DAY = 86_400_000
const RANGES = [
  { label: '1日', days: 1 },
  { label: '3日', days: 3 },
  { label: '7日', days: 7 },
  { label: '30日', days: 30 },
]
const ICON_SIZE = 20

interface Point {
  t: number
  pressure?: number
  level?: number
}

interface MedMark {
  id: string
  t: number
  name: string
  color: string
}

/** 複数日表示の横軸の目盛り。日付が重複しないよう、0時の位置に置く（長い期間は間引く） */
function dayTicks(from: number, to: number, days: number): number[] {
  const step = days <= 7 ? 1 : Math.ceil(days / 6)
  const ticks: number[] = []
  const d = new Date(from)
  d.setHours(24, 0, 0, 0)
  while (d.getTime() <= to) {
    ticks.push(d.getTime())
    d.setDate(d.getDate() + step)
  }
  return ticks
}

function tickLabel(t: number, days: number) {
  const d = new Date(t)
  return days <= 1 ? `${d.getHours()}時` : `${d.getMonth() + 1}/${d.getDate()}`
}

/** 頭痛レベルの点。レベルに応じた色で描く（気圧だけの点では描かない） */
function LevelDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: Point }) {
  if (cx === undefined || cy === undefined || payload?.level === undefined) return null
  return <circle cx={cx} cy={cy} r={5} fill={LEVEL_COLORS[payload.level as HeadacheLevel]} stroke="#ffffff" strokeWidth={1.5} />
}

export function PressureChart({ records, medicines }: { records: AppRecord[]; medicines: Medicine[] }) {
  const [days, setDays] = useState(3)
  const [openNote, setOpenNote] = useState<NoteMark | null>(null)
  // 表示範囲は「最新の記録」を基準にして、描画中に現在時刻を読まない
  const latest = records[0]?.ts ?? 0
  const from = latest - days * DAY

  const { points, meds, notes, pressureDomain } = useMemo(() => {
    const inRange = records.filter((r) => r.ts >= from).sort((a, b) => a.ts - b.ts)
    const points: Point[] = inRange.flatMap((r): Point[] => {
      if (r.type === 'headache') return [{ t: r.ts, level: r.level, pressure: r.pressure ?? undefined }]
      if (r.type === 'pressure' && r.pressure !== null) return [{ t: r.ts, pressure: r.pressure }]
      return []
    })
    const meds: MedMark[] = inRange.flatMap((r): MedMark[] =>
      r.type === 'medication' ? [{ id: r.id, t: r.ts, name: r.name, color: colorFor(medicines, r.name) }] : [],
    )
    // メモのある記録には付箋マークを付ける
    const notes: NoteMark[] = inRange.flatMap((r): NoteMark[] => {
      if (r.type === 'pressure' || !r.note) return []
      const title =
        r.type === 'headache'
          ? `頭痛 ${r.level}（${LEVEL_LABELS[r.level]}）`
          : `${r.name}${r.tablets !== undefined ? ` ${r.tablets}錠` : ''}`
      return [{ id: r.id, t: r.ts, title, text: r.note }]
    })
    // 錠剤アイコンを置く位置が決まるよう、気圧軸の範囲は自分で計算する
    const values = points.flatMap((p) => (p.pressure === undefined ? [] : [p.pressure]))
    const pressureDomain: [number, number] = values.length
      ? [Math.floor(Math.min(...values)) - 2, Math.ceil(Math.max(...values)) + 2]
      : [990, 1030]
    return { points, meds, notes, pressureDomain }
  }, [records, medicines, from])

  const usedMeds = useMemo(() => {
    const seen = new Map<string, string>()
    for (const m of meds) seen.set(m.name, m.color)
    return [...seen]
  }, [meds])

  if (points.length < 2) {
    return (
      <section className="card">
        <h2>気圧と頭痛の推移</h2>
        <p className="muted">記録が増えるとここにグラフが表示されます。</p>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="row">
        <h2>気圧と頭痛の推移</h2>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.days} className={days === r.days ? 'on' : ''} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={points} margin={{ top: ICON_SIZE, right: 0, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[from, latest]}
              ticks={days > 1 ? dayTicks(from, latest, days) : undefined}
              tickFormatter={(t: number) => tickLabel(t, days)}
              tick={{ fontSize: 11 }}
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
              labelFormatter={(t) => new Date(t as number).toLocaleString('ja-JP')}
              formatter={(v, name) => (name === '気圧' ? [`${Number(v).toFixed(1)} hPa`, name] : [String(v), name])}
            />
            {meds.map((m) => (
              <ReferenceLine key={m.id} yAxisId="p" x={m.t} stroke={m.color} strokeDasharray="4 3" strokeOpacity={0.7} />
            ))}
            <Line yAxisId="p" dataKey="pressure" name="気圧" stroke="#0f766e" strokeWidth={2} dot={false} connectNulls />
            <Line
              yAxisId="l"
              dataKey="level"
              name="頭痛"
              stroke="#dc2626"
              strokeWidth={2}
              connectNulls
              dot={<LevelDot />}
              activeDot={false}
              isAnimationActive={false}
            />
            {meds.map((m) => (
              <ReferenceDot
                key={m.id}
                yAxisId="p"
                x={m.t}
                y={pressureDomain[1]}
                shape={({ cx, cy }) => (
                  <PillIcon color={m.color} size={ICON_SIZE} x={(cx ?? 0) - ICON_SIZE / 2} y={(cy ?? 0) - ICON_SIZE / 2} />
                )}
              />
            ))}
            {notes.map((n) => (
              <ReferenceDot
                key={n.id}
                yAxisId="p"
                x={n.t}
                y={pressureDomain[0] + 1}
                shape={({ cx, cy }) => (
                  // 指で押しやすいよう、見た目より広い透明な当たり判定を重ねる
                  <g
                    role="button"
                    aria-label={`メモを開く: ${n.title}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setOpenNote(n)}
                  >
                    <circle cx={cx} cy={cy} r={18} fill="transparent" />
                    <StickyIcon size={ICON_SIZE} x={(cx ?? 0) - ICON_SIZE / 2} y={(cy ?? 0) - ICON_SIZE / 2} />
                  </g>
                )}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="legend">
        <li>
          <span className="swatch" style={{ background: '#0f766e' }} />
          気圧 (hPa・左軸)
        </li>
        <li>
          <span className="swatch" style={{ background: '#dc2626' }} />
          頭痛 (0–5・右軸)
        </li>
        {usedMeds.map(([name, color]) => (
          <li key={name}>
            <PillIcon color={color} size={16} />
            {name}
          </li>
        ))}
        {notes.length > 0 && (
          <li>
            <StickyIcon size={16} />
            メモ（タップで表示）
          </li>
        )}
      </ul>
      {openNote && <NotePopup note={openNote} onClose={() => setOpenNote(null)} />}
    </section>
  )
}

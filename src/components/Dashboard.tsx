import { lazy, Suspense, useMemo, useState } from 'react'
import { computeStats } from '../dashboardStats.ts'
import { LOCALES } from '../i18n/context.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { localizeMedicineName } from '../medicineNames.ts'
import { colorFor, type Medicine } from '../settings.ts'
import { LEVEL_COLORS, type AppRecord, type HeadacheLevel } from '../types.ts'

// グラフの部品（recharts）は大きいので別ファイルに分け、画面の他の部分を先に表示する
const PressureChart = lazy(() => import('./PressureChart.tsx').then((m) => ({ default: m.PressureChart })))

const LEVELS: HeadacheLevel[] = [5, 4, 3, 2, 1, 0]

interface Props {
  records: AppRecord[]
  medicines: Medicine[]
}

interface BarRowProps {
  name: string
  color?: string
  count: number
  max: number
}

function BarRow({ name, color, count, max }: BarRowProps) {
  const { t } = useI18n()
  return (
    <div className="dash-row">
      <span className="dash-name">
        {color && <i style={{ background: color }} />}
        <span>{name}</span>
      </span>
      <span className="dash-bar" aria-hidden="true">
        <span style={{ width: `${max === 0 ? 0 : (count / max) * 100}%`, background: color ?? 'var(--accent)' }} />
      </span>
      <span className="dash-count">{t('dash.count', { n: count })}</span>
    </div>
  )
}

/** 集計（件数・期間別・痛みの強さ別・薬ごと）と、気圧と記録のグラフ */
export function Dashboard({ records, medicines }: Props) {
  const { t, lang } = useI18n()
  // 「直近7日」などの基準は、この画面を開いた時刻
  const [now] = useState(() => Date.now())
  const stats = useMemo(() => computeStats(records, now), [records, now])
  const dateText = (ts: number) => new Date(ts).toLocaleDateString(LOCALES[lang])
  const months = stats.byMonth.slice(-6)
  const maxMonth = Math.max(0, ...months.map((m) => m.count))
  const maxLevel = Math.max(0, ...Object.values(stats.byLevel))
  const maxMed = Math.max(0, ...stats.byMedicine.map((m) => m.count))

  return (
    <>
      <section className="card dashboard-panel">
        <h2>{t('dash.title')}</h2>
        {stats.range === null ? (
          <p className="muted">{t('dash.empty')}</p>
        ) : (
          <>
            <p className="dash-period muted">
              {t('dash.period')}: {dateText(stats.range.from)} - {dateText(stats.range.to)}
            </p>
            <div className="dash-stats">
              <div className="dash-stat">
                <strong>{stats.headaches}</strong>
                <span>{t('dash.total')}</span>
              </div>
              <div className="dash-stat">
                <strong>{stats.medications}</strong>
                <span>{t('dash.meds')}</span>
              </div>
              <div className="dash-stat">
                <strong>{stats.last7}</strong>
                <span>{t('dash.last7')}</span>
              </div>
              <div className="dash-stat">
                <strong>{stats.last30}</strong>
                <span>{t('dash.last30')}</span>
              </div>
              <div className="dash-stat dash-stat-wide">
                <strong>{stats.days}</strong>
                <span>{t('dash.days')}</span>
              </div>
            </div>

            {stats.headaches > 0 && (
              <>
                <h3 className="dash-heading">{t('dash.byLevel')}</h3>
                {LEVELS.map((level) => (
                  <BarRow
                    key={level}
                    name={`${level} ${t(`level.${level}`)}`}
                    color={LEVEL_COLORS[level]}
                    count={stats.byLevel[level]}
                    max={maxLevel}
                  />
                ))}
                <h3 className="dash-heading">{t('dash.byMonth')}</h3>
                {months.map((m) => (
                  <BarRow key={m.month} name={m.month} count={m.count} max={maxMonth} />
                ))}
              </>
            )}

            {stats.byMedicine.length > 0 && (
              <>
                <h3 className="dash-heading">{t('dash.byMed')}</h3>
                {stats.byMedicine.map((m) => (
                  <BarRow
                    key={m.name}
                    name={localizeMedicineName(m.name, lang)}
                    color={colorFor(medicines, m.name)}
                    count={m.count}
                    max={maxMed}
                  />
                ))}
              </>
            )}
          </>
        )}
      </section>
      <Suspense fallback={<section className="card chart-loading" aria-busy="true" />}>
        <PressureChart records={records} medicines={medicines} />
      </Suspense>
    </>
  )
}

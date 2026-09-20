import type { PressureState } from '../hooks/usePressure.ts'
import { usePlaceName } from '../hooks/usePlaceName.ts'
import { discomfortCategory, discomfortColor, discomfortIndex } from '../discomfort.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { assessTrend } from '../warning.ts'
import { describeWeather } from '../weather.ts'
import { PressureSparkline } from './PressureSparkline.tsx'

interface Props {
  pressure: PressureState & { refresh: () => void }
}

export function PressureCard({ pressure }: Props) {
  const { t, lang } = useI18n()
  const { status, forecast, error, staleLocation, fetchedAt, refresh, position } = pressure
  // 気圧を取得している位置の市区町村名（取得できなければ付けない）
  const place = usePlaceName(position, lang)
  const weather = forecast ? describeWeather(forecast.weather.code, forecast.weather.isDay, t) : null
  // 天気ブロックの色は、気温と湿度から求めた不快指数で 青（快適）→紫（普通）→赤（不快）に変える
  const di = forecast ? discomfortIndex(forecast.weather.temperature, forecast.weather.humidity) : null
  // 言語を切り替えたらすぐ文言が変わるよう、表示のたびに作る（取得した時刻を基準にする）
  const trend = forecast && fetchedAt ? assessTrend(forecast, t, fetchedAt) : null

  return (
    <section className="card">
      <div className="row">
        <h2>{place ? t('pressure.titleAt', { place }) : t('pressure.title')}</h2>
        <button className="link" onClick={refresh} disabled={status === 'loading'}>
          {status === 'loading' ? t('pressure.loading') : t('pressure.refresh')}
        </button>
      </div>

      {forecast && weather ? (
        <>
          <div className="now">
            <p className="big big-pressure">
              {forecast.current.toFixed(1)}
              <span className="unit"> hPa</span>
            </p>
            <div
              className="weather"
              style={di === null ? undefined : { backgroundColor: discomfortColor(di) }}
              title={di === null ? undefined : t('di.title', { v: di.toFixed(0), label: t(`di.${discomfortCategory(di)}`) })}
            >
              <div className="weather-main">
                <span className="weather-icon" role="img" aria-label={weather.label}>
                  {weather.icon}
                </span>
                <span className="weather-label">{weather.label}</span>
              </div>
              {/* アイコンの右に、気温と湿度を2行で */}
              <div className="weather-meta">
                <span>{t('weather.temp', { v: Math.round(forecast.weather.temperature) })}</span>
                <span>{t('weather.humidity', { v: Math.round(forecast.weather.humidity) })}</span>
              </div>
            </div>
          </div>
          {fetchedAt && <PressureSparkline forecast={forecast} now={fetchedAt} />}
        </>
      ) : (
        status === 'loading' && <p className="muted">{t('pressure.fetching')}</p>
      )}

      {trend && (
        <p className={`banner banner-${trend.level}`} role={trend.level === 'none' ? undefined : 'alert'}>
          {trend.level === 'warning' && '⚠️ '}
          {trend.level === 'caution' && '⚠ '}
          {trend.message}
        </p>
      )}
      {staleLocation && <p className="muted">{t('pressure.staleLocation')}</p>}
      {error && (
        <>
          <p className="error">{t(error.kind === 'location' ? 'err.location' : 'err.pressure')}</p>
          <p className="muted small">
            {t('err.detail')}: {error.detail}
          </p>
        </>
      )}
    </section>
  )
}

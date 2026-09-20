import { aheadPoints, type Arrow } from '../forecast.ts'
import type { PressureState } from '../hooks/usePressure.ts'
import { describeWeather } from '../weather.ts'

interface Props {
  pressure: PressureState & { refresh: () => void }
}

const ARROW_TEXT: Record<Arrow, { symbol: string; label: string }> = {
  up: { symbol: '↗', label: '上昇' },
  down: { symbol: '↘', label: '下降' },
  flat: { symbol: '→', label: '横ばい' },
}

export function PressureCard({ pressure }: Props) {
  const { status, forecast, trend, error, staleLocation, fetchedAt, refresh } = pressure
  const weather = forecast ? describeWeather(forecast.weather.code, forecast.weather.isDay) : null
  const ahead = forecast && fetchedAt ? aheadPoints(forecast, fetchedAt) : []

  return (
    <section className="card">
      <div className="row">
        <h2>現在地の気圧</h2>
        <button className="link" onClick={refresh} disabled={status === 'loading'}>
          {status === 'loading' ? '取得中…' : '更新'}
        </button>
      </div>

      {forecast && weather ? (
        <div className="now">
          <div className="now-left">
            <p className="big">
              {forecast.current.toFixed(1)}
              <span className="unit"> hPa</span>
            </p>
            {ahead.length > 0 && (
              <ul className="ahead" aria-label="今後の気圧の変化">
                {ahead.map((p) => {
                  const a = ARROW_TEXT[p.arrow]
                  return (
                    <li key={p.hours} className={`ahead-item ahead-${p.arrow}`}>
                      <span className="ahead-when">{p.hours}時間後</span>
                      <span className="ahead-hpa">{p.hpa.toFixed(1)}</span>
                      <span className="ahead-diff">
                        <span className="ahead-arrow" role="img" aria-label={a.label}>
                          {a.symbol}
                        </span>
                        {p.diff > 0 ? '+' : ''}
                        {p.diff.toFixed(1)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="weather">
            <span className="weather-icon" role="img" aria-label={weather.label}>
              {weather.icon}
            </span>
            <span className="weather-label">{weather.label}</span>
            <span className="weather-meta">
              気温 {Math.round(forecast.weather.temperature)}°C
              <br />
              湿度 {Math.round(forecast.weather.humidity)}%
            </span>
          </div>
        </div>
      ) : (
        status === 'loading' && <p className="muted">気圧を取得しています…</p>
      )}

      {trend && (
        <p className={`banner banner-${trend.level}`} role={trend.level === 'none' ? undefined : 'alert'}>
          {trend.level === 'warning' && '⚠️ '}
          {trend.level === 'caution' && '⚠ '}
          {trend.message}
        </p>
      )}
      {staleLocation && <p className="muted">位置情報が取れないため、前回の位置で取得しています。</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}

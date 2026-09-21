import type { TFn } from './i18n/context.ts'

interface PressurePoint {
  /** epoch ms */
  t: number
  hpa: number
  /** WMO 天気コード */
  code: number
  isDay: boolean
}

/** 推移グラフ用の、細かい間隔の気圧 */
interface FinePoint {
  /** epoch ms */
  t: number
  hpa: number
}

export interface PressureForecast {
  /** 現在の気圧 (hPa) */
  current: number
  /** 現在の天気 */
  weather: { code: number; isDay: boolean; temperature: number; humidity: number }
  /** 過去6時間〜先12時間の1時間ごとの気圧と天気 */
  series: PressurePoint[]
  /** 過去6時間〜先12時間の15分ごとの気圧。取得できない地域では空 */
  fine: FinePoint[]
}

interface OpenMeteoResponse {
  current: {
    time: number
    surface_pressure: number
    weather_code: number
    is_day: number
    temperature_2m: number
    relative_humidity_2m: number
  }
  hourly: {
    time: number[]
    surface_pressure: number[]
    weather_code: number[]
    is_day: number[]
  }
  minutely_15?: { time: number[]; surface_pressure: (number | null)[] }
}

/** Open-Meteo (APIキー不要) から現在地の気圧・天気と予報を取得する */
export async function fetchPressure(lat: number, lon: number): Promise<PressureForecast> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'surface_pressure,weather_code,is_day,temperature_2m,relative_humidity_2m',
    hourly: 'surface_pressure,weather_code,is_day',
    past_hours: '6',
    forecast_hours: '12',
    minutely_15: 'surface_pressure',
    past_minutely_15: '24',
    forecast_minutely_15: '48',
    timeformat: 'unixtime',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`pressure-fetch-failed-${res.status}`)
  const data = (await res.json()) as OpenMeteoResponse
  const series = data.hourly.time.map((t, i) => ({
    t: t * 1000,
    hpa: data.hourly.surface_pressure[i],
    code: data.hourly.weather_code[i],
    isDay: data.hourly.is_day[i] === 1,
  }))
  const fine = (data.minutely_15?.time ?? []).flatMap((t, i): FinePoint[] => {
    const hpa = data.minutely_15?.surface_pressure[i]
    return typeof hpa === 'number' ? [{ t: t * 1000, hpa }] : []
  })
  return {
    current: data.current.surface_pressure,
    weather: {
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
    },
    series,
    fine,
  }
}

export interface WeatherView {
  icon: string
  label: string
}

/** WMO 天気コードを絵文字アイコンと、表示する言語のラベルにする */
export function describeWeather(code: number, isDay: boolean, t: TFn): WeatherView {
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', label: t('w.clear') }
  if (code === 1) return { icon: isDay ? '🌤️' : '🌙', label: t('w.mostlyClear') }
  if (code === 2) return { icon: isDay ? '⛅' : '☁️', label: t('w.partlyCloudy') }
  if (code === 3) return { icon: '☁️', label: t('w.cloudy') }
  if (code === 45 || code === 48) return { icon: '🌫️', label: t('w.fog') }
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: t('w.drizzle') }
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: t('w.rain') }
  if (code >= 71 && code <= 77) return { icon: '🌨️', label: t('w.snow') }
  if (code >= 80 && code <= 82) return { icon: '🌦️', label: t('w.showers') }
  if (code === 85 || code === 86) return { icon: '🌨️', label: t('w.snowShowers') }
  if (code >= 95) return { icon: '⛈️', label: t('w.thunder') }
  return { icon: '🌡️', label: t('w.unknown') }
}

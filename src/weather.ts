export interface PressurePoint {
  /** epoch ms */
  t: number
  hpa: number
  /** WMO 天気コード */
  code: number
  isDay: boolean
}

export interface PressureForecast {
  /** 現在の気圧 (hPa) */
  current: number
  /** 現在の天気 */
  weather: { code: number; isDay: boolean; temperature: number; humidity: number }
  /** 過去6時間〜先12時間の1時間ごとの気圧と天気 */
  series: PressurePoint[]
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
    timeformat: 'unixtime',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`気圧の取得に失敗しました (${res.status})`)
  const data = (await res.json()) as OpenMeteoResponse
  const series = data.hourly.time.map((t, i) => ({
    t: t * 1000,
    hpa: data.hourly.surface_pressure[i],
    code: data.hourly.weather_code[i],
    isDay: data.hourly.is_day[i] === 1,
  }))
  return {
    current: data.current.surface_pressure,
    weather: {
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
    },
    series,
  }
}

export interface WeatherView {
  icon: string
  label: string
}

/** WMO 天気コードを絵文字アイコンと日本語ラベルにする */
export function describeWeather(code: number, isDay: boolean): WeatherView {
  if (code === 0) return isDay ? { icon: '☀️', label: '晴れ' } : { icon: '🌙', label: '晴れ' }
  if (code === 1) return isDay ? { icon: '🌤️', label: 'おおむね晴れ' } : { icon: '🌙', label: 'おおむね晴れ' }
  if (code === 2) return { icon: isDay ? '⛅' : '☁️', label: 'くもり時々晴れ' }
  if (code === 3) return { icon: '☁️', label: 'くもり' }
  if (code === 45 || code === 48) return { icon: '🌫️', label: '霧' }
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: '霧雨' }
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: '雨' }
  if (code >= 71 && code <= 77) return { icon: '🌨️', label: '雪' }
  if (code >= 80 && code <= 82) return { icon: '🌦️', label: 'にわか雨' }
  if (code === 85 || code === 86) return { icon: '🌨️', label: 'にわか雪' }
  if (code >= 95) return { icon: '⛈️', label: '雷雨' }
  return { icon: '🌡️', label: '—' }
}

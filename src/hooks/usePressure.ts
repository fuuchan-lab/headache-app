import { useCallback, useEffect, useRef, useState } from 'react'
import { getPosition, type Position } from '../geo.ts'
import { fetchPressure, type PressureForecast } from '../weather.ts'
import { assessTrend, type TrendAssessment } from '../warning.ts'

export interface PressureState {
  status: 'loading' | 'ready' | 'error'
  forecast: PressureForecast | null
  position: Position | null
  trend: TrendAssessment | null
  error: string | null
  /** 位置情報が取得できず前回の位置を使っている */
  staleLocation: boolean
  /** 取得完了時刻 */
  fetchedAt: number | null
}

const initial: PressureState = {
  status: 'loading',
  forecast: null,
  position: null,
  trend: null,
  error: null,
  staleLocation: false,
  fetchedAt: null,
}

/**
 * 現在地の気圧を取得する。アプリを開いた時・画面に戻った時に更新し、
 * 取得できるたびに onFetched を呼ぶ（記録の保存は呼び出し側で行う）。
 */
export function usePressure(onFetched: (forecast: PressureForecast, pos: Position) => void) {
  const [state, setState] = useState<PressureState>(initial)
  const onFetchedRef = useRef(onFetched)
  useEffect(() => {
    onFetchedRef.current = onFetched
  })

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, status: s.forecast ? 'ready' : 'loading', error: null }))
    try {
      const { pos, fresh } = await getPosition()
      const forecast = await fetchPressure(pos.lat, pos.lon)
      setState({
        status: 'ready',
        forecast,
        position: pos,
        trend: assessTrend(forecast),
        error: null,
        staleLocation: !fresh,
        fetchedAt: Date.now(),
      })
      onFetchedRef.current(forecast, pos)
    } catch (e) {
      const message =
        e instanceof GeolocationPositionError
          ? '位置情報を取得できませんでした。ブラウザの位置情報の許可を確認してください。'
          : e instanceof Error
            ? e.message
            : '気圧を取得できませんでした。'
      setState((s) => ({ ...s, status: s.forecast ? 'ready' : 'error', error: message }))
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  return { ...state, refresh }
}

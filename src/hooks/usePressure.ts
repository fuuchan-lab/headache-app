import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError } from '../errors.ts'
import { getPosition, type Position } from '../geo.ts'
import { fetchPressure, type PressureForecast } from '../weather.ts'

/** 失敗した段階（位置情報の取得 / 気圧データの取得）と、原因の切り分け用の詳細 */
export interface PressureError {
  kind: 'location' | 'pressure'
  detail: string
}

export interface PressureState {
  status: 'loading' | 'ready' | 'error'
  forecast: PressureForecast | null
  position: Position | null
  /** 失敗した時の内容。表示する文言は画面側で言語に合わせて選ぶ */
  error: PressureError | null
  /** 位置情報が取得できず前回の位置を使っている */
  staleLocation: boolean
  /** 取得完了時刻 */
  fetchedAt: number | null
}

const initial: PressureState = {
  status: 'loading',
  forecast: null,
  position: null,
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
    const fail = (kind: PressureError['kind'], e: unknown) => {
      console.error(`[pressure:${kind}]`, e)
      setState((s) => ({ ...s, status: s.forecast ? 'ready' : 'error', error: { kind, detail: describeError(e) } }))
    }

    let located: Awaited<ReturnType<typeof getPosition>>
    try {
      located = await getPosition()
    } catch (e) {
      fail('location', e)
      return
    }
    const { pos, fresh } = located

    let forecast: PressureForecast
    try {
      forecast = await fetchPressure(pos.lat, pos.lon)
    } catch (e) {
      fail('pressure', e)
      return
    }
    setState({
      status: 'ready',
      forecast,
      position: pos,
      error: null,
      staleLocation: !fresh,
      fetchedAt: Date.now(),
    })
    onFetchedRef.current(forecast, pos)
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

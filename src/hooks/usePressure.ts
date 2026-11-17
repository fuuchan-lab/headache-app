import { useCallback, useEffect, useRef, useState } from 'react'
import { describeError } from '../errors.ts'
import { loadCachedForecast, saveCachedForecast } from '../forecastCache.ts'
import { getPosition, type Position } from '../geo.ts'
import { fetchPressure, type PressureForecast } from '../weather.ts'

/** 失敗した段階（位置情報の取得 / 気圧データの取得）と、原因の切り分け用の詳細 */
export interface PressureError {
  kind: 'location' | 'pressure'
  detail: string
  /** 位置情報のエラーコード（1: 許可されていない / 2: 特定できない / 3: 時間切れ）。それ以外は undefined */
  code?: number
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
  /**
   * 表示している気圧・予報が、端末に残しておいた前回の取得分（電波がない時など）。
   * いまの気圧ではないので、記録には付けない
   */
  fromCache: boolean
}

const initial: PressureState = {
  status: 'loading',
  forecast: null,
  position: null,
  error: null,
  staleLocation: false,
  fetchedAt: null,
  fromCache: false,
}

/** 前回の取得分が端末に残っていれば、それを表示しながら最新の取得を待つ（オフラインでも予報を見られる） */
function initialState(): PressureState {
  const cached = loadCachedForecast()
  if (!cached) return initial
  return { ...initial, status: 'ready', forecast: cached.forecast, position: cached.position, fetchedAt: cached.fetchedAt, fromCache: true }
}

function geolocationCode(e: unknown): number | undefined {
  if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'number') {
    return (e as { code: number }).code
  }
  return undefined
}

/**
 * 現在地の気圧を取得する。アプリを開いた時・画面に戻った時に更新し、
 * 取得できるたびに onFetched を呼ぶ（記録の保存は呼び出し側で行う）。
 */
export function usePressure(onFetched: (forecast: PressureForecast, pos: Position) => void) {
  const [state, setState] = useState<PressureState>(initialState)
  const onFetchedRef = useRef(onFetched)
  useEffect(() => {
    onFetchedRef.current = onFetched
  })

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, status: s.forecast ? 'ready' : 'loading', error: null }))
    const fail = (kind: PressureError['kind'], e: unknown, freshPosition?: Position) => {
      console.error(`[pressure:${kind}]`, e)
      setState((s) => ({
        ...s,
        // 電波がなくて気圧が取れなくても、GPS で場所が取れていれば、記録にはその場所を残す（気圧はなし）
        // 前回の取得分を表示している時も、記録には今の場所を残す
        position: (!s.forecast || s.fromCache) && freshPosition ? freshPosition : s.position,
        status: s.forecast ? 'ready' : 'error',
        error: { kind, detail: describeError(e), code: geolocationCode(e) },
      }))
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
      fail('pressure', e, fresh ? pos : undefined)
      return
    }
    const fetchedAt = Date.now()
    setState({
      status: 'ready',
      forecast,
      position: pos,
      error: null,
      staleLocation: !fresh,
      fetchedAt,
      fromCache: false,
    })
    saveCachedForecast({ forecast, position: pos, fetchedAt })
    onFetchedRef.current(forecast, pos)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    // ネットにつながった時に、その場所の気圧を取り直して記録する
    const onOnline = () => void refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [refresh])

  return { ...state, refresh }
}

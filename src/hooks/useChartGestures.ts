import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { panWindow, zoomWindow, type TimeWindow } from '../chartView.ts'

/** これ以上動いたら、タップではなくドラッグとして扱う (px) */
const DRAG_THRESHOLD = 6
/** ピンチの2本の指の間隔がこれより狭い時は、倍率を計算しない（ゼロ割りやぶれ防止） (px) */
const MIN_PINCH_DISTANCE = 10

interface Options {
  /** いまの表示範囲 */
  window: TimeWindow
  /** 動かせる範囲の限界（記録のある範囲） */
  limits: TimeWindow
  onChange: (w: TimeWindow) => void
}

interface Gesture {
  /** ジェスチャーを始めた時の表示範囲。ここを基準にして拡大縮小・移動を計算する */
  base: TimeWindow
  startX: number
  startDistance: number
  moved: boolean
}

/**
 * グラフの拡大縮小と移動の操作:
 *  - 2本指のピンチ（開くと拡大、閉じると縮小）
 *  - 1本指・マウスのドラッグで左右に移動
 *  - Ctrl + ホイール（トラックパッドのピンチ）で拡大縮小
 * ドラッグした後にグラフ上のアイコンが「タップされた」扱いにならないよう、click を止める。
 */
export function useChartGestures(opts: Options) {
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  const pointers = useRef(new Map<number, number>()) // pointerId → clientX
  const gesture = useRef<Gesture | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const xs = () => [...pointers.current.values()]
  const spread = () => {
    const [a, b] = xs()
    return b === undefined ? 0 : Math.abs(a - b)
  }
  const startGesture = (moved: boolean) => {
    gesture.current = {
      base: optsRef.current.window,
      startX: xs()[0] ?? 0,
      startDistance: spread(),
      moved,
    }
  }

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.size === 0) gesture.current = null
    pointers.current.set(e.pointerId, e.clientX)
    startGesture(gesture.current?.moved ?? false)
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, e.clientX)
    const g = gesture.current
    const rect = e.currentTarget.getBoundingClientRect()
    const { limits, onChange } = optsRef.current

    if (pointers.current.size >= 2) {
      // ピンチ: 2本の指の間隔の変化で拡大縮小。2本の中点の下にある時刻は動かさない
      if (g.startDistance < MIN_PINCH_DISTANCE || spread() < MIN_PINCH_DISTANCE) return
      const [a, b] = xs()
      const anchor = Math.min(1, Math.max(0, ((a + b) / 2 - rect.left) / rect.width))
      g.moved = true
      onChange(zoomWindow(g.base, spread() / g.startDistance, anchor, limits))
      return
    }

    // 1本指・マウス: ドラッグで左右に移動
    const dx = e.clientX - g.startX
    if (!g.moved && Math.abs(dx) < DRAG_THRESHOLD) return
    if (!g.moved) {
      // 動き始めたら、指やマウスがグラフの外に出ても追従する。無効なポインターだと例外になるので無視する
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // 追従できなくても、グラフの上での操作は続けられる
      }
    }
    g.moved = true
    const spanMs = g.base.to - g.base.from
    onChange(panWindow(g.base, (-dx / rect.width) * spanMs, limits))
  }, [])

  const onPointerEnd = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    // 指が1本残った時は、その時点の表示範囲を基準にして続きのドラッグを計算し直す
    if (pointers.current.size > 0) startGesture(true)
  }, [])

  // タップではなくドラッグだった場合は、アイコンの click を発生させない
  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gesture.current?.moved) {
      e.stopPropagation()
      e.preventDefault()
      gesture.current.moved = false
    }
  }, [])

  // Ctrl + ホイール。ページのスクロールと区別するため、ブラウザ標準の拡大を止める必要があり、passive にできない
  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
  }, [])
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const { window, limits, onChange } = optsRef.current
      const rect = el.getBoundingClientRect()
      const anchor = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      onChange(zoomWindow(window, Math.exp(-e.deltaY * 0.01), anchor, limits))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  return {
    setContainer,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onClickCapture },
  }
}

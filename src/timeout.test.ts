import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { raceTimeout } from './timeout.ts'

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }))
afterEach(() => mock.timers.reset())

const flush = () => new Promise<void>((r) => setImmediate(r))

function track<T>(p: Promise<T>) {
  const state: { status: 'pending' | 'resolved' | 'rejected'; value?: T; error?: unknown } = { status: 'pending' }
  p.then(
    (value) => Object.assign(state, { status: 'resolved', value }),
    (error) => Object.assign(state, { status: 'rejected', error }),
  )
  return state
}

test('時間内に結果が返れば、その値になる', async () => {
  let resolveInner!: (v: string) => void
  const inner = new Promise<string>((r) => (resolveInner = r))
  const s = track(raceTimeout(inner, 15_000, () => new Error('timeout')))
  mock.timers.tick(5_000)
  resolveInner('position')
  await flush()
  assert.deepEqual([s.status, s.value], ['resolved', 'position'])
})

test('答えが返らないまま時間を過ぎたら、用意したエラーで失敗する（いつまでも待たない）', async () => {
  const never = new Promise<string>(() => {})
  const s = track(raceTimeout(never, 15_000, () => ({ code: 3, message: 'no response' })))
  mock.timers.tick(14_999)
  await flush()
  assert.equal(s.status, 'pending')
  mock.timers.tick(1)
  await flush()
  assert.deepEqual([s.status, s.error], ['rejected', { code: 3, message: 'no response' }])
})

test('時間内に元の処理が失敗したら、そのエラーをそのまま返す', async () => {
  let rejectInner!: (e: unknown) => void
  const inner = new Promise<string>((_, rej) => (rejectInner = rej))
  const s = track(raceTimeout(inner, 15_000, () => new Error('timeout')))
  rejectInner({ code: 1, message: 'denied' })
  await flush()
  assert.deepEqual([s.status, s.error], ['rejected', { code: 1, message: 'denied' }])
})

test('結果が返ったあとは、時間切れのエラーが出ない', async () => {
  let resolveInner!: (v: string) => void
  const inner = new Promise<string>((r) => (resolveInner = r))
  const s = track(raceTimeout(inner, 15_000, () => new Error('timeout')))
  resolveInner('ok')
  await flush() // 結果が返った後の処理（時間切れの取り消し）が済んでから、時間を進める
  mock.timers.tick(60_000)
  await flush()
  assert.deepEqual([s.status, s.value], ['resolved', 'ok'])
})

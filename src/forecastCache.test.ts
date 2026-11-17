import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CACHE_MAX_AGE_MS, parseCachedForecast } from './forecastCache.ts'

const NOW = Date.UTC(2026, 10, 17, 12, 0)
const entry = (fetchedAt: number) =>
  JSON.stringify({
    forecast: { current: 1008.2, weather: { code: 0, isDay: true, temperature: 15, humidity: 60 }, series: [], fine: [] },
    position: { lat: 35.68, lon: 139.76 },
    fetchedAt,
  })

test('保存した予報を読み戻せる', () => {
  const c = parseCachedForecast(entry(NOW - 3_600_000), NOW)
  assert.equal(c?.forecast.current, 1008.2)
  assert.deepEqual(c?.position, { lat: 35.68, lon: 139.76 })
})

test('予報の終わりを過ぎた古いものは使わない', () => {
  assert.equal(parseCachedForecast(entry(NOW - CACHE_MAX_AGE_MS - 1), NOW), null)
})

test('壊れた・形の違うデータは null', () => {
  assert.equal(parseCachedForecast(null, NOW), null)
  assert.equal(parseCachedForecast('{', NOW), null)
  assert.equal(parseCachedForecast(JSON.stringify({ fetchedAt: NOW }), NOW), null)
})

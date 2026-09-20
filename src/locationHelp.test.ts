import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LOCATION_STEPS, detectPlatform } from './locationHelp.ts'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const MAC = IPAD_DESKTOP

test('iPhone は ios（iPhone の Chrome も含む）', () => {
  assert.equal(detectPlatform(IPHONE), 'ios')
})

test('iPadOS は Mac と同じ名乗りだが、タッチ操作できるので ios。タッチのない Mac は other', () => {
  assert.equal(detectPlatform(IPAD_DESKTOP, 5), 'ios')
  assert.equal(detectPlatform(MAC, 0), 'other')
})

test('Android は android、Windows は other', () => {
  assert.equal(detectPlatform(ANDROID), 'android')
  assert.equal(detectPlatform(WINDOWS), 'other')
})

test('手順は、日本語・英語とも、3種類の端末すべてにあり、空ではない', () => {
  for (const lang of ['ja', 'en'] as const) {
    for (const platform of ['ios', 'android', 'other'] as const) {
      const steps = LOCATION_STEPS[lang][platform]
      assert.ok(steps.length >= 3, `${lang}/${platform}`)
      assert.ok(steps.every((s) => s.trim().length > 0))
    }
  }
})

test('日本語と英語で、同じ端末の手順の数がそろっている', () => {
  for (const platform of ['ios', 'android', 'other'] as const) {
    assert.equal(LOCATION_STEPS.ja[platform].length, LOCATION_STEPS.en[platform].length, platform)
  }
})

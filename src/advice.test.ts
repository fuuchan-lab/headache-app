import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ADVICE } from './advice.ts'
import { translate, type TFn } from './i18n/context.ts'
import { assessTrend } from './warning.ts'
import type { PressureForecast } from './weather.ts'

const tJa: TFn = (key, vars) => translate('ja', key, vars)

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 8, 20, 12)

/** 現在 1010hPa。h 時間後の気圧が delta だけ変わる予報（delta は 上がれば正） */
function forecast(deltas: Record<number, number>): PressureForecast {
  const series = Array.from({ length: 19 }, (_, i) => {
    const h = i - 6
    return { t: NOW + h * HOUR, hpa: 1010 + (deltas[h] ?? 0), code: 0, isDay: true }
  })
  return { current: 1010, weather: { code: 0, isDay: true, temperature: 20, humidity: 50 }, series, fine: [] }
}

test('気圧が下がる予報なら下降、上がる予報なら上昇、変わらなければ安定', () => {
  assert.equal(assessTrend(forecast({ 3: -2 }), tJa, NOW).direction, 'falling')
  assert.equal(assessTrend(forecast({ 3: 2 }), tJa, NOW).direction, 'rising')
  assert.equal(assessTrend(forecast({ 6: 3 }), tJa, NOW).direction, 'rising')
  assert.equal(assessTrend(forecast({}), tJa, NOW).direction, 'stable')
})

test('上昇の時は、お知らせの種類が info で、メッセージは上昇の文言', () => {
  const a = assessTrend(forecast({ 3: 2.5 }), tJa, NOW)
  assert.equal(a.level, 'info')
  assert.equal(a.message, '気圧が上がりつつあります。')
})

test('直前3時間で上がっていれば、これからの予報が安定でも上昇として扱う', () => {
  assert.equal(assessTrend(forecast({ [-3]: -2.5 }), tJa, NOW).direction, 'rising')
  assert.equal(assessTrend(forecast({ [-3]: 2.5 }), tJa, NOW).direction, 'falling')
})

test('下降と上昇の両方が予報にあるときは、下降を優先する（頭痛のきっかけになりやすいため）', () => {
  assert.equal(assessTrend(forecast({ 2: -2.5, 5: 4 }), tJa, NOW).direction, 'falling')
})

test('アドバイスは日本語・英語とも、同じ構成（下降・上昇・共通）と項目数を持つ', () => {
  for (const key of ['falling', 'rising', 'common'] as const) {
    assert.equal(ADVICE.ja[key].items.length, ADVICE.en[key].items.length, key)
    assert.ok(ADVICE.ja[key].items.length > 0)
    for (const lang of ['ja', 'en'] as const) {
      for (const item of ADVICE[lang][key].items) assert.ok(item.lead.length > 0 && item.body.length > 0)
    }
  }
  assert.equal(ADVICE.ja.falling.items.length, 4)
  assert.equal(ADVICE.ja.rising.items.length, 3)
  assert.equal(ADVICE.ja.common.items.length, 2)
})

test('下降のアドバイスには冷やす・暗い部屋・入浴を控える・カフェイン、上昇には温める・ストレッチ・水分が含まれる', () => {
  const falling = ADVICE.ja.falling.items.map((i) => i.lead).join('/')
  for (const w of ['冷やして', '静かで暗い部屋', '入浴やマッサージは控える', 'カフェイン']) assert.ok(falling.includes(w), w)
  const rising = ADVICE.ja.rising.items.map((i) => i.lead).join('/')
  for (const w of ['温めてほぐす', 'ストレッチ', '水分']) assert.ok(rising.includes(w), w)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatPlace } from './placeName.ts'

test('日本語は「都道府県＋市区町村」', () => {
  assert.equal(formatPlace({ city: '横浜市', province: '神奈川県' }, 'ja'), '神奈川県横浜市')
  assert.equal(formatPlace({ city: '札幌市', province: '北海道', 'ISO3166-2-lvl4': 'JP-01' }, 'ja'), '北海道札幌市')
})

test('英語は「市区町村, 都道府県」', () => {
  assert.equal(formatPlace({ city: 'Yokohama', province: 'Kanagawa Prefecture' }, 'en'), 'Yokohama, Kanagawa Prefecture')
})

test('東京23区は province が空でも、ISO コードから東京都を補う', () => {
  const tokyo = { city: '新宿区', 'ISO3166-2-lvl4': 'JP-13' }
  assert.equal(formatPlace(tokyo, 'ja'), '東京都新宿区')
  assert.equal(formatPlace({ city: 'Shinjuku', 'ISO3166-2-lvl4': 'JP-13' }, 'en'), 'Shinjuku, Tokyo')
})

test('city がなければ town → village → county の順に使う', () => {
  assert.equal(formatPlace({ town: '毛呂山町', province: '埼玉県' }, 'ja'), '埼玉県毛呂山町')
  assert.equal(formatPlace({ village: '小さな村', province: '長野県' }, 'ja'), '長野県小さな村')
  assert.equal(formatPlace({ county: '入間郡', province: '埼玉県' }, 'ja'), '埼玉県入間郡')
})

test('海外は state を使う', () => {
  assert.equal(formatPlace({ city: 'San Francisco', state: 'California' }, 'en'), 'San Francisco, California')
})

test('都道府県と市区町村が同じ名前なら1つだけ', () => {
  assert.equal(formatPlace({ city: '東京都', province: '東京都' }, 'ja'), '東京都')
})

test('片方しか分からなければ、分かる方だけ。どちらもなければ null', () => {
  assert.equal(formatPlace({ province: '沖縄県' }, 'ja'), '沖縄県')
  assert.equal(formatPlace({ city: '那覇市' }, 'ja'), '那覇市')
  assert.equal(formatPlace({}, 'ja'), null)
})

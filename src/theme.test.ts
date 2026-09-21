import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseTheme } from './theme.ts'

test('保存された値が light / dark ならその配色、それ以外や未保存は自動', () => {
  assert.equal(parseTheme('light'), 'light')
  assert.equal(parseTheme('dark'), 'dark')
  assert.equal(parseTheme('auto'), 'auto')
  assert.equal(parseTheme(null), 'auto')
  assert.equal(parseTheme(undefined), 'auto')
  assert.equal(parseTheme('sepia'), 'auto')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { amount, total, group, sum, checks } from '../app/features/vouchers/model.ts'
import { loadMockRows, saveMockRows } from '../app/features/vouchers/mockData.ts'
test('integer amounts reject malformed values and sum without precision loss', () => {
  for (const value of ['-1', '1.1', '1e3', '', '1000000000000000']) assert.equal(amount(value), false)
  assert.equal(amount('999999999999999'), true)
  const row = loadMockRows('sales')[0]!
  assert.equal(total({ ...row, supply: '999999999999999', vat: '999999999999999' }), '1999999999999998')
})
test('voucher groups use both date and number; balanced and unbalanced examples', () => {
  const rows = loadMockRows('general')
  const row = rows[0]!
  assert.equal(group(rows, row).length, 2)
  assert.equal(group([...rows, { ...row, date: '2026-12-01' }], row).length, 2)
  assert.equal(sum(group(rows, row), 'debit'), sum(group(rows, row), 'credit'))
  rows[1]!.credit = '1'
  assert.equal(checks(rows, row, 'general').find(c => c.key === 'debit')?.ok, false)
})
test('mock instances and saved rows are independent; required and zero VAT checks', () => {
  const rows = loadMockRows('sales'), other = loadMockRows('sales')
  const saved = saveMockRows(rows)
  rows[0]!.memo = ''; rows[0]!.vat = '0'
  assert.notEqual(saved[0]!.memo, '')
  assert.notEqual(other[0]!.memo, '')
  assert.equal(checks(rows, rows[0]!, 'sales').find(c => c.key === 'memo')?.ok, false)
  assert.equal(checks(rows, rows[0]!, 'sales').find(c => c.key === 'vat')?.ok, false)
})

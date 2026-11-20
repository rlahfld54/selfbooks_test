import { test } from 'node:test'
import assert from 'node:assert/strict'
import { columns, dateWithDay } from '../app/features/vouchers/model.ts'

test('general grid matches displayed date and entry columns', () => {
  assert.deepEqual(columns('general').map(col => col.key), [
    'year', 'month', 'day', 'kind', 'account', 'accountName', 'client',
    'clientName', 'memoCode', 'memo', 'debit', 'credit', 'attachment',
  ])
  assert.ok(columns('general').find(col => col.key === 'year')?.readonly)
  assert.ok(columns('general').find(col => col.key === 'month')?.readonly)
  assert.equal(columns('general').find(col => col.key === 'clientName')?.readonly, false)
  assert.equal(columns('sales').find(col => col.key === 'clientName')?.readonly, true)
})

test('day entry retains year and month and supports leap years', () => {
  assert.equal(dateWithDay('2026-11-01', '9'), '2026-11-09')
  assert.equal(dateWithDay('2028-02-01', '29'), '2028-02-29')
})

test('invalid days cannot overflow into another query month', () => {
  for (const day of ['0', '31', '-1', '1.5', '', 'abc']) {
    assert.equal(dateWithDay('2026-11-01', day), null)
  }
  assert.equal(dateWithDay('2026-02-01', '29'), null)
})

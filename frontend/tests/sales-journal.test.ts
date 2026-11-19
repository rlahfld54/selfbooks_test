import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  copyDraft,
  createSalesJournalService,
  emptyDraft,
  filterRecords,
  monthRange,
  salesCategories,
  sumAmounts,
  type SalesRecord,
  type SalesTransport,
} from '../app/features/sales-journal/services/salesJournal.ts'
test('save strips display fields, copies lines and uses correct methods', async () => {
  const row = {
    ...emptyDraft(),
    id: 'test-id',
    version: 2,
    partner: 'display',
    lines: [{ side: 'debit' as const, account: 'a', amount: '10', memo: '' }],
  }
  const copy = copyDraft(row)
  copy.lines[0]!.amount = '99'
  assert.equal(row.lines[0]!.amount, '10')
  assert.equal('partner' in copy, false)
  const calls: any[] = []
  const request = (async (path: string, options: unknown) => {
    calls.push([path, options])
    return { data: row }
  }) as SalesTransport
  const service = createSalesJournalService(request)
  await service.save({ ...row, version: 0 })
  await service.save(row)
  await service.remove(row)
  assert.equal(calls[0][1].method, 'POST')
  assert.equal(calls[1][1].method, 'PUT')
  assert.equal(calls[2][0], '/sales-journal/test-id?version=2')
})
test('filter combines inclusive dates, type and text', () => {
  const rows = [
    {
      ...emptyDraft(),
      date: '2026-11-10',
      type: '51',
      partner: '샘플문구유통',
      partnerCode: '',
      item: '품명',
    },
  ] as SalesRecord[]
  assert.equal(
    filterRecords(rows, { from: '2026-11-10', to: '2026-11-10', type: '51', query: '문구' }).length,
    1,
  )
  assert.equal(
    filterRecords(rows, { from: '2026-11-10', to: '2026-11-10', type: '11', query: '' }).length,
    0,
  )
})

test('metadata and list forward the same abort signal to both requests', async () => {
  const controller = new AbortController()
  const paths: string[] = []
  const request: SalesTransport = async (path, options) => {
    paths.push(path)
    assert.equal(options?.signal, controller.signal)
    options?.signal?.throwIfAborted()
    throw new Error('Expected a cancelled signal')
  }
  const service = createSalesJournalService(request)
  controller.abort()
  await assert.rejects(service.metadata(controller.signal), { name: 'AbortError' })
  await assert.rejects(service.list(controller.signal), { name: 'AbortError' })
  assert.deepEqual(paths, ['/sales-journal/meta', '/sales-journal'])
})
test('integer totals retain precision and incomplete inputs are safe', () => {
  assert.equal(sumAmounts(['900719925474099312345', '55']), '900719925474099312400')
  assert.equal(sumAmounts(['', '-', '0']), '0')
})

test('payment categories combine transaction type, payment, dates and search', () => {
  const records = [
    { ...emptyDraft(), id: 'sale-card', date: '2026-11-01', type: '11', payment: '카드', partner: '문구', partnerCode: '' },
    { ...emptyDraft(), id: 'sale-cash', date: '2026-11-30', type: '11', payment: '현금', partner: '문구', partnerCode: '' },
    { ...emptyDraft(), id: 'purchase-card', date: '2026-11-15', type: '51', payment: '카드', partner: '문구', partnerCode: '' },
    { ...emptyDraft(), id: 'outside', date: '2026-12-01', type: '11', payment: '카드', partner: '문구', partnerCode: '' },
  ] as SalesRecord[]
  const base = { from: '2026-11-01', to: '2026-11-30', query: '문구' }
  const category = salesCategories.find(row => row.value === 'sales-card')!
  assert.deepEqual(filterRecords(records, { ...base, ...category }).map(row => row.id), ['sale-card'])
  assert.equal(filterRecords(records, { ...base, type: '11', payment: '' }).length, 2)
  assert.equal(filterRecords(records, { ...base, type: '', payment: '' }).length, 3)
  assert.equal(filterRecords(records, { ...base, ...category, query: '없는 거래처' }).length, 0)
  assert.equal(filterRecords(records, { ...base, type: '51', payment: '현금' }).length, 0)
})

test('monthly ranges handle leap years, year end and invalid inputs', () => {
  assert.deepEqual(monthRange('2026-11'), { from: '2026-11-01', to: '2026-11-30' })
  assert.deepEqual(monthRange('2026-12'), { from: '2026-12-01', to: '2026-12-31' })
  assert.equal(monthRange('2024-02')?.to, '2024-02-29')
  assert.equal(monthRange('2100-02')?.to, '2100-02-28')
  assert.equal(monthRange('2000-02')?.to, '2000-02-29')
  for (const invalid of ['', '2026-00', '2026-13', '2026-2', '0000-01', '2026-01-01']) {
    assert.equal(monthRange(invalid), null)
  }
})

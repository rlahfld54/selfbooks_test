import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  copyDraft,
  createSalesJournalService,
  emptyDraft,
  filterRecords,
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
test('integer totals retain precision and incomplete inputs are safe', () => {
  assert.equal(sumAmounts(['900719925474099312345', '55']), '900719925474099312400')
  assert.equal(sumAmounts(['', '-', '0']), '0')
})

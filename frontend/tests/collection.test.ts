import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient } from '../app/services/api-client.ts'
import { createCollectionService } from '../app/features/collection/services/collection.ts'
import { createPreviewCollectionService } from '../app/features/collection/services/previewCollection.ts'
import {
  bundleNotice, canCancel, canRetry, categoryTotals, collectedNotice, companySummary, defaultPeriod, filterHistory, halfPeriod, hometaxMaintenance, salesPurchasePeriod, filterCompanies, formatDuration, groupRunItems, inPeriod, overlayRun,
  runCounts, runFinished, runProgress, statusSummary, validPeriod,
} from '../app/features/collection/logic.ts'
import { COLLECTION_KINDS, SUMMARY_LINES, type CollectionRun, type CollectionRunItem } from '../app/features/collection/types.ts'

const item = (patch: Partial<CollectionRunItem>): CollectionRunItem => ({
  id: 'i', clientId: 'C1', clientName: '샘플', kind: 'tax', status: 'waiting', message: '', count: null, durationMs: null, ...patch,
})
const run = (items: CollectionRunItem[]): CollectionRun => ({ id: 'r', from: '2026-01-01', to: '2026-03-31', startedAt: '2026-11-18T00:00:00Z', finishedAt: null, items })

/** 미리보기 작업이 끝날 때까지 기다린다 */
async function settle(service: ReturnType<typeof createPreviewCollectionService>, id: string) {
  for (let i = 0; i < 200; i++) {
    const { data } = await service.run(id)
    if (runFinished(data)) { return data }
    await new Promise(resolve => setTimeout(resolve, 1))
  }
  throw new Error('preview run did not finish')
}

test('kinds follow the team lead scrap server: business info first, then 4 sales and 4 purchase kinds', () => {
  assert.deepEqual(COLLECTION_KINDS.map(kind => kind.type), ['bizinfo', 'tax', 'invoice', 'cash', 'cardzero', 'ptax', 'pinvoice', 'pcash', 'pcard'])
  assert.equal(new Set(COLLECTION_KINDS.map(kind => kind.type)).size, COLLECTION_KINDS.length)
})

test('run counts, progress and grouping treat skipped and failed items as finished', () => {
  const sample = run([
    item({ id: 'a', status: 'done' }), item({ id: 'b', status: 'failed', clientId: 'C2', clientName: '둘' }),
    item({ id: 'c', status: 'skipped', clientId: 'C2', clientName: '둘' }), item({ id: 'd', status: 'running' }),
  ])
  assert.deepEqual(runCounts(sample), { running: 1, waiting: 0, done: 1, skipped: 1, failed: 1, cancelled: 0, total: 4 })
  assert.equal(runProgress(sample), 0.75)
  assert.equal(runFinished(sample), false)
  assert.deepEqual(groupRunItems(sample).map(group => group.clientId), ['C2', 'C1'], 'companies with failures come first')
  assert.equal(runProgress(null), 0)
  assert.equal(runFinished(null), false)
})

test('locked accounts cannot be retried, other failures can be retried by a person', () => {
  assert.equal(canRetry(item({ status: 'failed', code: 'ACCOUNT_LOCKED' })), false)
  assert.equal(canRetry(item({ status: 'failed', code: 'BAD_CREDENTIALS' })), true)
  assert.equal(canRetry(item({ status: 'done' })), false)
})

test('period helpers compare monthly card totals by month and reject reversed ranges', () => {
  assert.deepEqual(defaultPeriod(new Date(2026, 10, 18)), { from: '2026-01-01', to: '2026-11-18' })
  assert.equal(validPeriod('2026-01-01', '2026-03-31'), true)
  assert.equal(validPeriod('2026-04-01', '2026-03-31'), false)
  assert.equal(validPeriod('2026-1-1', '2026-03-31'), false)
  assert.equal(inPeriod('2026-03', '2026-03-15', '2026-04-10'), true)
  assert.equal(inPeriod('2026-02', '2026-03-15', '2026-04-10'), false)
  assert.equal(inPeriod('2026-03-14', '2026-03-15', '2026-04-10'), false)
  assert.equal(formatDuration(3200), '3초')
  assert.equal(formatDuration(78000), '1분 18초')
  assert.equal(formatDuration(null), '')
})

test('preview status lists active sample clients and filters by name, business number and manager', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const { data } = await service.status()
  assert.equal(data.sample, true)
  assert.ok(data.companies.length > 0)
  assert.ok(data.companies.every(company => Object.keys(company.cells).length === COLLECTION_KINDS.length))
  const first = data.companies[0]!
  assert.deepEqual(filterCompanies(data.companies, first.bizNo.replace(/-/g, ''), '').map(row => row.clientId), [first.clientId])
  assert.ok(filterCompanies(data.companies, '', first.manager).every(row => row.manager === first.manager))
  assert.equal(filterCompanies(data.companies, '없는 업체', '').length, 0)
  const summary = statusSummary(data.companies)
  assert.equal(summary.companies, data.companies.length)
})

test('preview run skips the remaining kinds after a login failure but still checks business status', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 0, today: () => new Date(2026, 10, 18) })
  const kinds = COLLECTION_KINDS.map(kind => kind.type)
  const { data: started } = await service.start({ clientIds: ['C003', 'C001'], kinds, from: '2026-01-01', to: '2026-11-18' })
  assert.equal(started.items.length, kinds.length * 2)
  const done = await settle(service, started.id)
  assert.ok(done.finishedAt)
  const cafe = done.items.filter(row => row.clientId === 'C003')
  assert.equal(cafe.find(row => row.kind === 'bizinfo')!.status, 'done')
  assert.equal(cafe.find(row => row.kind === 'tax')!.status, 'failed')
  assert.equal(cafe.find(row => row.kind === 'tax')!.code, 'NO_CREDENTIALS')
  assert.ok(cafe.filter(row => !['bizinfo', 'tax'].includes(row.kind)).every(row => row.status === 'skipped'))
  assert.ok(done.items.filter(row => row.clientId === 'C001').every(row => row.status === 'done'))

  const { data: status } = await service.status()
  const cell = status.companies.find(row => row.clientId === 'C003')!.cells.tax!
  assert.equal(cell.status, 'failed')
  assert.equal(cell.collectedAt, '2026-11-18')
})

test('preview never collects the same company twice at once and validates input', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 5 })
  const first = await service.start({ clientIds: ['C001'], kinds: ['tax', 'ptax'], from: '2026-01-01', to: '2026-03-31' })
  const second = await service.start({ clientIds: ['C001'], kinds: ['tax'], from: '2026-01-01', to: '2026-03-31' })
  assert.equal(second.data.items[0]!.status, 'skipped')
  assert.match(second.data.items[0]!.message, /이미 수집 중/)
  await settle(service, first.data.id)
  await assert.rejects(service.start({ clientIds: ['없음'], kinds: ['tax'], from: '2026-01-01', to: '2026-03-31' }))
  await assert.rejects(service.start({ clientIds: ['C001'], kinds: [], from: '2026-01-01', to: '2026-03-31' }))
  service.dispose()
})

test('preview warning responses are skipped, not saved as zero rows', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const { data } = await service.start({ clientIds: ['C008'], kinds: ['invoice', 'tax'], from: '2026-01-01', to: '2026-11-18' })
  const done = await settle(service, data.id)
  assert.equal(done.items.find(row => row.kind === 'invoice')!.status, 'skipped')
  assert.equal(done.items.find(row => row.kind === 'tax')!.status, 'done')
})

test('preview retry reruns only the failed item and rows only include collected kinds within the period', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const { data } = await service.start({ clientIds: ['C003'], kinds: ['tax'], from: '2026-01-01', to: '2026-11-18' })
  const failed = (await settle(service, data.id)).items[0]!
  assert.equal(failed.status, 'failed')
  const retried = await service.retry(data.id, failed.id)
  assert.ok(['waiting', 'running'].includes(retried.data.items[0]!.status), 'retry restarts the item immediately')
  assert.equal(retried.data.finishedAt, null)
  assert.equal((await settle(service, data.id)).items[0]!.status, 'failed')
  await assert.rejects(service.retry(data.id, 'missing'))

  const rows = await service.rows({ clientId: 'C001', from: '2026-01-01', to: '2026-11-18' })
  assert.ok(rows.data.length > 0)
  assert.ok(rows.data.every(row => inPeriod(row.date, '2026-01-01', '2026-11-18')))
  const none = await service.rows({ clientId: 'C009', from: '2026-01-01', to: '2026-11-18' })
  assert.equal(none.data.length, 0, 'never-collected company has no rows')
  const narrow = await service.rows({ clientId: 'C001', from: '2026-01-01', to: '2026-01-05' })
  assert.ok(narrow.data.length < rows.data.length)
})

test('live run items overlay table cells without touching finished cells', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const { data } = await service.status()
  const overlay = overlayRun(data.companies, run([item({ clientId: 'C001', kind: 'tax', status: 'running' }), item({ clientId: 'C001', kind: 'ptax', status: 'done' })]))
  const company = overlay.find(row => row.clientId === 'C001')!
  assert.equal(company.cells.tax!.status, 'running')
  assert.equal(company.cells.ptax!.status, data.companies.find(row => row.clientId === 'C001')!.cells.ptax!.status)
  assert.equal(overlayRun(data.companies, null), data.companies)
})

test('collection API service calls the Fastify paths with encoded ids and bodies', async () => {
  const calls: { path: string, method?: string, body?: unknown }[] = []
  const request = createApiClient(async <T>(path: string, options: { method?: string, body?: object }) => {
    calls.push({ path, method: options.method, body: options.body })
    return { data: null } as T
  }, 'http://localhost:4000/api')
  const service = createCollectionService(request)
  await service.status()
  await service.start({ clientIds: ['a'], kinds: ['tax'], from: '2026-01-01', to: '2026-03-31' })
  await service.run('run/1')
  await service.retry('run/1', 'item?1')
  await service.rows({ clientId: 'c&1', from: '2026-01-01', to: '2026-03-31' })
  await service.cancel('run/1')
  await service.history('c&1')
  assert.deepEqual(calls.map(call => call.path), [
    '/collection/status', '/collection/runs', '/collection/runs/run%2F1', '/collection/runs/run%2F1/items/item%3F1/retry',
    '/collection/rows?clientId=c%261&from=2026-01-01&to=2026-03-31', '/collection/runs/run%2F1/cancel', '/collection/history?clientId=c%261',
  ])
  assert.equal(calls[5]!.method, 'POST')
  assert.equal(calls[1]!.method, 'POST')
  assert.deepEqual(calls[1]!.body, { clientIds: ['a'], kinds: ['tax'], from: '2026-01-01', to: '2026-03-31' })
})

test('company summary follows the 화면모음 자료수집현황: 6 sales and 5 purchase lines, bank excluded from purchase amount', async () => {
  assert.deepEqual(SUMMARY_LINES.filter(line => line.flow === 'sale').length, 6)
  assert.deepEqual(SUMMARY_LINES.filter(line => line.flow === 'purchase').length, 5)
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const company = (await service.status()).data.companies.find(row => row.clientId === 'C001')!
  const { data: rows } = await service.rows({ clientId: 'C001', from: '2026-01-01', to: '2026-11-18' })
  const summary = companySummary(company, rows)
  const ptax = summary.purchase.find(line => line.key === 'ptax')!
  assert.equal(ptax.count, rows.filter(row => row.kind === 'ptax').length)
  assert.equal(ptax.total, rows.filter(row => row.kind === 'ptax').reduce((sum, row) => sum + row.total, 0))
  const bank = summary.purchase.find(line => line.isBank)!
  assert.equal(bank.linked, false)
  assert.equal(bank.total, null)
  assert.ok(summary.sale.every(line => line.linked), 'payment agency kinds come with the card sales call')
  assert.equal(summary.sale.find(line => line.key === 'sagency')!.cell, company.cells.cardzero, 'agency lines follow the card sales job status')
  assert.deepEqual(summary.purchase.filter(line => !line.linked).map(line => line.key), ['pbank'])
  assert.equal(summary.kpi.saleCount, rows.filter(row => ['tax', 'invoice', 'cardzero', 'cash'].includes(row.kind)).length)
  assert.equal(summary.kpi.purchaseTotal, summary.purchase.filter(line => !line.isBank).reduce((sum, line) => sum + (line.total ?? 0), 0))
})

test('hometax maintenance window is 00-06 KST regardless of the browser time zone', () => {
  assert.equal(hometaxMaintenance(new Date('2026-11-18T15:30:00Z')), true, '15:30 UTC is 00:30 KST')
  assert.equal(hometaxMaintenance(new Date('2026-11-18T20:59:00Z')), true, '05:59 KST')
  assert.equal(hometaxMaintenance(new Date('2026-11-18T21:00:00Z')), false, '06:00 KST')
  assert.equal(hometaxMaintenance(new Date('2026-11-18T05:00:00Z')), false, '14:00 KST')
})

test('cancel stops waiting items as 중단됨, keeps finished ones, and both land in the history', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 5, parallel: 1, requester: '테스터' })
  const { data } = await service.start({ clientIds: ['C001', 'C002'], kinds: ['tax', 'ptax'], from: '2026-01-01', to: '2026-03-31' })
  assert.equal(canCancel(data), true)
  await new Promise(resolve => setTimeout(resolve, 8))
  const { data: stopped } = await service.cancel(data.id)
  const done = await settle(service, stopped.id)
  assert.ok(done.items.some(item => item.status === 'cancelled'), 'waiting items were cancelled')
  assert.ok(done.items.filter(item => item.status === 'cancelled').every(item => item.message === '사용자가 중단했습니다.'))
  assert.ok(done.items.some(item => item.status === 'done'), 'the running item finished')
  assert.equal(canCancel(done), false)
  assert.equal(runCounts(done).cancelled, done.items.filter(item => item.status === 'cancelled').length)
  const history = (await service.history('C002')).data
  assert.ok(history.some(item => item.status === 'cancelled' && item.requester === '테스터'))
  assert.ok(history.every(item => item.clientId === 'C002'))
  assert.equal(filterHistory(history, 'ptax').every(item => item.kind === 'ptax'), true)
  service.dispose()
})

test('history keeps the newest request first, with period, login type, count and failure reason', async () => {
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const { data } = await service.start({ clientIds: ['C003'], kinds: ['tax'], from: '2026-01-01', to: '2026-06-30' })
  await settle(service, data.id)
  const [latest] = (await service.history('C003')).data
  assert.equal(latest!.kind, 'tax')
  assert.equal(latest!.status, 'failed')
  assert.equal(latest!.loginType, 'idpw')
  assert.equal(latest!.from, '2026-01-01')
  assert.equal(latest!.to, '2026-06-30')
  assert.match(latest!.message, /홈택스 아이디/)
})

test('rows view helpers: VAT halves, per-category totals and the already-collected notice', async () => {
  assert.deepEqual(halfPeriod(2026, 0), { from: '2026-01-01', to: '2026-12-31' })
  assert.deepEqual(halfPeriod(2026, 1), { from: '2026-01-01', to: '2026-06-30' })
  assert.deepEqual(halfPeriod(2026, 2), { from: '2026-07-01', to: '2026-12-31' })
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const { data: rows } = await service.rows({ clientId: 'C001', ...halfPeriod(2026, 0) })
  const totals = categoryTotals(rows)
  assert.equal(totals.ptax!.count, rows.filter(row => row.kind === 'ptax').length)
  assert.equal(totals.ptax!.total, rows.filter(row => row.kind === 'ptax').reduce((sum, row) => sum + row.total, 0))
  const first = await service.rows({ clientId: 'C001', ...halfPeriod(2026, 1) })
  assert.ok(first.data.every(row => row.date.slice(0, 7) <= '2026-06'))
  const { data: status } = await service.status()
  const pick = status.companies.filter(row => ['C001', 'C009'].includes(row.clientId))
  assert.match(collectedNotice(pick, 'tax'), /2곳 중 1곳 수집/)
  assert.equal(collectedNotice(pick.filter(row => row.clientId === 'C009'), 'tax'), '')
})

test('sales/purchase is one Easybooks line: default period and the bundle notice need all 8 kinds', async () => {
  assert.deepEqual(salesPurchasePeriod(new Date(2026, 10, 18)), { from: '2024-01-01', to: '2026-11-18' })
  const service = createPreviewCollectionService({ stepMs: () => 0 })
  const { data } = await service.status()
  const ps = COLLECTION_KINDS.filter(kind => kind.flow !== 'info').map(kind => kind.type)
  const full = data.companies.filter(row => row.clientId === 'C001')
  assert.match(bundleNotice(full, ps), /모두 수집/)
  const partial = data.companies.filter(row => row.clientId === 'C006')
  assert.equal(bundleNotice(partial, ps), '', 'a company missing some kinds is not counted as collected')
})

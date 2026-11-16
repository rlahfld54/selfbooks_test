import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPartnersService, partnerColumns, partnerTableRow } from '../app/features/demo-partners/services/partnersApi.ts'
import { preparePartners } from '../app/features/demo-partners/services/partnerImport.ts'

const rows = () => preparePartners({ headers: [], unknown: [], rows: [{ line: 2, values: { name: '테스트', registration: '0123456789', postalCode: '00123', phone: '010-0000-0000' }, errors: [], warnings: [] }] }, [])
test('table exposes exactly the requested 15 columns and preserves leading zeros', () => {
  assert.equal(partnerColumns.length, 15)
  const row = partnerTableRow(rows()[0]!)
  assert.equal(row.registration, '0123456789')
  assert.equal(row.postalCode, '00123')
  assert.equal(row.phone, '010-0000-0000')
  assert.equal(row.email, '—')
})
test('service sends only original data, source line, review issues and stable retry ID', async () => {
  const calls: { path: string; options: any }[] = []
  const service = createPartnersService(async <T>(path: string, options?: any) => { calls.push({ path, options }); return { data: [] as T } })
  await service.list(); await service.insert(rows(), 'batch-id')
  assert.equal(calls[0]!.path, '/partners')
  assert.equal(calls[1]!.path, '/partners/import')
  assert.deepEqual(Object.keys(calls[1]!.options.body).sort(), ['batchId', 'rows'])
  assert.deepEqual(Object.keys(calls[1]!.options.body.rows[0]).sort(), ['importIssues', 'information', 'sourceLine'])
})
test('save errors propagate for modal retry', async () => {
  const service = createPartnersService(async () => { throw new Error('save failed') })
  await assert.rejects(service.insert(rows(), 'batch-id'), /save failed/)
})

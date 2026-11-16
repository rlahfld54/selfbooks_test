import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Pool } from 'pg'
import { validatePartnerImport, partnerIssues, partnerKey } from '../src/services/partners-validation.js'
import { createPartnersRepository, partnerRecord } from '../src/services/partners-repository.js'
import { buildApp } from '../src/app.js'

const batchId = '80000000-0000-4000-8000-000000000001'
const information = { name: '테스트', registration: '0123456789', businessType: '1', representative: '담당', industryCode: '01', businessCategory: '소매', industry: '문구' }
const input = () => validatePartnerImport({ batchId, rows: [{ sourceLine: 2, information, importIssues: [] }] })

test('import validates structural limits and refuses caller scope, empty batches and duplicate source lines', () => {
  assert.equal(input().rows.length, 1)
  for (const body of [{ ...input(), officeId: 'other' }, { batchId, rows: [] }, { batchId, rows: [input().rows[0], input().rows[0]] }, { batchId, rows: [{ sourceLine: 2, information: { name: 'x'.repeat(101) } }] }])
    assert.throws(() => validatePartnerImport(body))
})
test('duplicate comparison includes all industry fields and is normalized; bad values remain reviewable', () => {
  const keys = new Set<string>(), codes = new Set<string>()
  assert.deepEqual(partnerIssues(information, keys, codes), [])
  assert.deepEqual(partnerIssues({ ...information, industryCode: '02' }, keys, codes), [])
  assert.ok(partnerIssues({ ...information, registration: '012-34-56789', industry: ' 문구 ' }, keys, codes).some(value => value.includes('중복')))
  assert.equal(partnerKey(information), partnerKey({ ...information, industry: ' 문구 ' }))
  assert.ok(partnerIssues({ registration: 'bad', email: 'bad', code: 'DUP' }, new Set(), new Set(['DUP'])).length >= 5)
})
test('all 15 fields and original invalid values survive database mapping without confusing office and contact fields', () => {
  const record = partnerRecord({ id: 'id', name: 'legacy', business_type: '업태', business_item: '업종', phone: 'office-phone', contact_phone: 'contact-phone', import_information: { registration: 'invalid', postalCode: '00123' }, import_issues: ['확인'] })
  assert.equal(record.information.businessCategory, '업태')
  assert.equal(record.information.industry, '업종')
  assert.equal(record.information.phone, 'contact-phone')
  assert.equal(record.registration, 'invalid')
  assert.equal(record.status, '확인요망')
  assert.equal(record.information.postalCode, '00123')
})
function fixture(options: { blocked?: boolean; failInsert?: boolean; previous?: unknown[] } = {}) {
  const calls: { sql: string; values?: any[] }[] = []
  let released = false
  const pool = { connect: async () => ({ query: async (sql: string, values?: any[]) => {
    calls.push({ sql, values })
    if (sql.includes('AS blocked')) return { rows: [{ blocked: options.blocked ?? false }] }
    if (sql.startsWith('SELECT id')) return { rows: [{ id: 'server-office' }] }
    if (sql.includes('AND import_batch_id=$2')) return { rows: options.previous ?? [] }
    if (sql.startsWith('INSERT')) {
      if (options.failInsert) throw new Error('insert failure')
      return { rows: JSON.parse(values![4]).map((row: object, i: number) => ({ id: String(i), ...row })) }
    }
    return { rows: [] }
  }, release() { released = true } }) } as unknown as Pool
  return { calls, repo: createPartnersRepository(pool, 'server-office', 'server-user'), released: () => released }
}
test('bulk INSERT parameterizes malicious text, injects server identity, and commits once', async () => {
  const f = fixture()
  const body = input(); body.rows[0]!.information.name = "x'); DROP TABLE tax_offices; --"
  const rows = await f.repo.insert(body)
  assert.equal(rows.length, 1)
  const insert = f.calls.find(call => call.sql.startsWith('INSERT'))!
  assert.equal(insert.sql.includes('DROP TABLE'), false)
  assert.deepEqual(insert.values!.slice(0, 3), ['server-office', 'server-user', batchId])
  assert.equal(f.calls.filter(call => call.sql.startsWith('INSERT')).length, 1)
  assert.equal(f.calls.at(-1)?.sql, 'COMMIT')
  assert.ok(f.released())
})
test('insert failure and bypassed policy roll back and release; blocked policy never reads records', async () => {
  for (const options of [{ failInsert: true }, { blocked: true }]) {
    const f = fixture(options)
    await assert.rejects(f.repo.insert(input()))
    assert.equal(f.calls.at(-1)?.sql, 'ROLLBACK')
    assert.ok(f.released())
    if ('blocked' in options) assert.equal(f.calls.some(call => call.sql.startsWith('SELECT *')), false)
  }
})
test('list reads only server office and its managed rows in read-only transaction', async () => {
  const f = fixture(); await f.repo.list()
  assert.equal(f.calls[0]?.sql, 'BEGIN READ ONLY')
  const query = f.calls.find(call => call.sql.startsWith('SELECT *'))!
  assert.match(query.sql, /WHERE id=\$1 OR managed_by_office_id=\$1/)
  assert.deepEqual(query.values, ['server-office'])
  assert.equal(f.calls.some(call => call.sql.includes('FOR SHARE')), false)
})
test('partner endpoints require authentication and explicit development setup', async () => {
  const app = buildApp({ frontendOrigin: 'http://localhost:3000' })
  try {
    const response = await app.inject({ method: 'GET', url: '/api/partners', headers: { host: 'localhost' }, remoteAddress: '127.0.0.1' })
    assert.equal(response.statusCode, 503)
    assert.equal(response.json().error.code, 'AUTH_UNAVAILABLE')
  } finally { await app.close() }
})

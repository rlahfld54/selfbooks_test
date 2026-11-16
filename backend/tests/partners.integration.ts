// Real Supabase round trip. All synthetic data lives in an outer rollback transaction.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { loadConfig } from '../src/config/env.js'
import { createPool } from '../src/db/pool.js'
import { createPartnersRepository } from '../src/services/partners-repository.js'
import { validatePartnerImport } from '../src/services/partners-validation.js'
const config = loadConfig()
if (!config.development || !config.databaseUrl || !config.fixtures) throw new Error('Development DB required')
const pool = createPool(config.databaseUrl, config.caPath)
try {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const user = (await db.query('SELECT id FROM public.users LIMIT 1')).rows[0]
    assert.ok(user, 'Existing user required')
    const nested = { connect: async () => ({
      query: (sql: string, values?: unknown[]) => {
        if (sql === 'BEGIN' || sql === 'BEGIN READ ONLY') return db.query('SAVEPOINT partner_test')
        if (sql === 'COMMIT') return db.query('RELEASE SAVEPOINT partner_test')
        if (sql === 'ROLLBACK') return db.query('ROLLBACK TO SAVEPOINT partner_test')
        return db.query(sql, values)
      }, release() {},
    }) } as unknown as Pool
    const repo = createPartnersRepository(nested, config.fixtures.officeId, user.id)
    const before = await repo.list()
    const info = { registration: '0123456789', businessType: '2', corporationNumber: '0123456789012', name: '통합검증 거래처', representative: '검증', industryCode: 'A', businessCategory: '테스트', industry: '검증업', postalCode: '00123', address: '검증주소', addressDetail: '1층', contactName: '담당자', phone: '010-0000-0000', email: 'test@example.invalid', mobile: '010-1111-1111' }
    const body = validatePartnerImport({ batchId: randomUUID(), rows: [
      { sourceLine: 2, information: info },
      { sourceLine: 3, information: { ...info, industryCode: 'B' } },
      { sourceLine: 4, information: info },
      { sourceLine: 5, information: { ...info, registration: 'invalid', corporationNumber: 'bad' } },
    ] })
    const saved = await repo.insert(body)
    assert.equal(saved.length, 4)
    assert.deepEqual(saved[0]!.information, { ...info, code: saved[0]!.code })
    assert.equal(saved[1]!.importIssues.some(issue => issue.includes('중복')), false)
    assert.equal(saved[2]!.importIssues.some(issue => issue.includes('중복')), true)
    assert.equal(saved[3]!.registration, 'invalid')
    assert.ok(saved[3]!.importIssues.length >= 2)
    assert.equal((await repo.list()).length, before.length + 4)
    const retry = await repo.insert(body)
    assert.deepEqual(retry.map(row => row.id).sort(), saved.map(row => row.id).sort())
    assert.equal((await repo.list()).length, before.length + 4)
    await assert.rejects(repo.insert({ ...body, rows: body.rows.slice(0, 1) }), /식별자/)
    // A failed foreign key must not leave part of a batch behind.
    const badActor = createPartnersRepository(nested, config.fixtures.officeId, randomUUID())
    await assert.rejects(badActor.insert({ ...body, batchId: randomUUID() }))
    assert.equal((await repo.list()).length, before.length + 4)
    const otherId = randomUUID()
    await db.query('INSERT INTO public.tax_offices (id,name) VALUES ($1,$2)', [otherId, '격리 검증 사무소'])
    const isolated = await createPartnersRepository(nested, otherId, user.id).list()
    assert.equal(isolated.length, 1)
    assert.equal(isolated[0]!.id, otherId)
    console.log('PASS: 15 fields, industry variants, review issues, raw invalid values, persistence, retry idempotency, atomic rollback, scope isolation')
  } finally { await db.query('ROLLBACK'); db.release() }
} catch (error) {
  console.error('Partner integration failed:', (error as { code?: string }).code ?? (error as Error).message)
  process.exitCode = 1
} finally { await pool.end() }

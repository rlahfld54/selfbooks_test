import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Pool } from 'pg'
import Fastify from 'fastify'
import { createAccountDefaults } from '../src/services/account-defaults.js'
import { accountDefaultsRoutes } from '../src/routes/account-defaults.js'
import { buildApp } from '../src/app.js'
import { AuthError } from '../src/services/auth.js'

test('default master is read in a read-only transaction, excludes deleted rows and releases connection', async () => {
  const calls: string[] = []
  const rows = [{ sourceId: '9007199254740993', code: '101', name: '현금' }]
  const db = {
    query: async (sql: string) => { calls.push(sql); return { rows: sql.includes('pg_policy') ? [{ blocked: false }] : sql.includes('SELECT account_default_id') ? rows : [] } },
    release: () => { calls.push('release') },
  }
  const result = await createAccountDefaults({ connect: async () => db } as unknown as Pool)()
  assert.deepEqual(result, rows)
  assert.equal(calls[0], 'BEGIN READ ONLY')
  assert.ok(calls.some(sql => sql.includes('WHERE deleted_at IS NULL')))
  assert.ok(calls.some(sql => sql.includes('ORDER BY sort_order, account_code, account_default_id')))
  assert.deepEqual(calls.slice(-2), ['COMMIT', 'release'])
})
test('bypassed row policies fail closed and release connection', async () => {
  const calls: string[] = []
  const db = { query: async (sql: string) => {
    calls.push(sql)
    return { rows: sql.includes('pg_policy') ? [{ blocked: true }] : [] }
  }, release: () => { calls.push('release') } }
  await assert.rejects(createAccountDefaults({ connect: async () => db } as unknown as Pool))
  assert.ok(!calls.some(sql => sql.includes('SELECT account_default_id')))
  assert.deepEqual(calls.slice(-2), ['ROLLBACK', 'release'])
})
test('route returns data and sanitizes database failure', async () => {
  for (const fails of [false, true]) {
    const app = Fastify()
    await accountDefaultsRoutes(app, async () => { if (fails) throw new Error('secret connection details'); return [] })
    try {
      const response = await app.inject('/api/account-defaults')
      assert.equal(response.statusCode, fails ? 503 : 200)
      assert.equal(response.headers['cache-control'], 'no-store')
      assert.ok(!response.body.includes('secret'))
      if (!fails) assert.deepEqual(response.json(), { data: [] })
    } finally { await app.close() }
  }
})
test('default master requires existing authentication', async () => {
  const app = buildApp({ frontendOrigin: 'http://localhost:3000', authenticate: async () => { throw new AuthError(401, 'UNAUTHORIZED', '인증 필요') } })
  try { assert.equal((await app.inject({ url: '/api/account-defaults', headers: { host: 'localhost' } })).statusCode, 401) }
  finally { await app.close() }
})

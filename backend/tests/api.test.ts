import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import type { TestContext } from 'node:test'
import type { Pool } from 'pg'
import { buildApp } from '../src/app.js'

const frontendOrigin = 'http://localhost:3000'
const headers = { host: 'localhost:4000', origin: frontendOrigin }
const officeId = '10000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
const fixtures = { officeId, clientIds: [id] }
const client = { id, officeId, name: '샘플', taxpayerKind: 'individual', status: 'active' }

function setup(t: TestContext, blocked = false) {
  const query = t.mock.fn(async (sql: string, values?: unknown[]) => {
    if (sql.includes('pg_catalog.pg_policy')) return { rows: [{ blocked }] }
    if (sql.includes('FROM public.clients')) {
      return { rows: values?.length === 3 && values[2] !== id ? [] : [client] }
    }
    if (sql.includes('FROM public.tax_offices')) return { rows: [{ id: officeId, name: '샘플 사무소' }] }
    return { rows: [] }
  })
  const release = t.mock.fn()
  const end = t.mock.fn(async () => {})
  const pool = Object.assign(new EventEmitter(), {
    connect: async () => ({ query, release }), query, end,
  }) as unknown as Pool
  const app = buildApp({ frontendOrigin, fixtures, pool, authenticate: async () => ({ id: 'test-user', name: 'Test', email: 'test@example.test', officeId, role: 'ADMIN' }) })
  return { app, query, release, end }
}

test('health, scoped directory queries and pool shutdown', async (t) => {
  const { app, query, end } = setup(t)
  try {
    for (const [url, data] of [
      ['/api/health', { status: 'ok' }],
      ['/api/health/db', { status: 'ok' }],
      ['/api/clients', [client]],
      ['/api/clients/' + id, client],
      ['/api/tax-offices', [{ id: officeId, name: '샘플 사무소' }]],
    ] as const) {
      const response = await app.inject({ url, headers })
      assert.equal(response.statusCode, 200)
      assert.equal(response.headers['access-control-allow-origin'], frontendOrigin)
      assert.equal(response.headers['cache-control'], 'no-store')
      assert.deepEqual(response.json(), { data })
    }
    assert.ok(query.mock.calls.some(({ arguments: args }) =>
      args[0].includes('id = $3') && JSON.stringify(args[1]) === JSON.stringify([officeId, [id], id])))
  } finally {
    await app.close()
  }
  assert.equal(end.mock.callCount(), 1)
})

test('invalid UUID, unknown UUID and external requests are rejected', async (t) => {
  const { app } = setup(t)
  t.after(() => app.close())
  for (const [url, code] of [
    ['/api/clients/invalid', 400],
    ['/api/clients/20000000-0000-4000-8000-000000000099', 404],
    ['/api/unknown', 404],
  ] as const) {
    assert.equal((await app.inject({ url, headers })).statusCode, code)
  }
  for (const request of [
    { headers, remoteAddress: '192.0.2.1' },
    { headers: { ...headers, host: 'example.com' } },
    { headers: { ...headers, origin: 'https://example.com' } },
  ]) {
    assert.equal((await app.inject({ url: '/api/clients', ...request })).statusCode, 403)
  }
})

test('a policy that would be bypassed prevents fixture reads', async (t) => {
  const { app, query, release } = setup(t, true)
  t.after(() => app.close())
  const response = await app.inject({ url: '/api/clients', headers })
  assert.equal(response.statusCode, 503)
  assert.equal(response.json().error.code, 'DIRECTORY_UNAVAILABLE')
  assert.ok(query.mock.calls.every(({ arguments: args }) => !args[0].includes('FROM public.clients')))
  assert.ok(query.mock.calls.some(({ arguments: args }) => args[0] === 'ROLLBACK'))
  assert.equal(release.mock.callCount(), 1)
})

test('missing database configuration returns a generic 503', async (t) => {
  const app = buildApp({ frontendOrigin, authenticate: async () => ({ id: 'test-user', name: 'Test', email: 'test@example.test', officeId, role: 'ADMIN' }) })
  t.after(() => app.close())
  const response = await app.inject({ url: '/api/health/db', headers })
  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.json(), { error: { code: 'DB_UNAVAILABLE', message: 'Database unavailable' } })
})

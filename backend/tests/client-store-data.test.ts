import test from 'node:test'
import assert from 'node:assert/strict'
import type { Pool } from 'pg'
import { createCollectionRepository } from '../src/services/collection-repository.js'

function fakePool(rows: object[], blocked = false) {
  const queries: { sql: string; params?: unknown[] }[] = []
  const db = {
    async query(sql: string, params?: unknown[]) {
      queries.push({ sql, params })
      if (sql.includes('pg_policy')) return { rows: [{ blocked }] }
      if (sql.includes('to_regclass')) return { rows: [{ ready: false }] }
      if (sql.includes('to_jsonb(c)')) return { rows }
      return { rows: [] }
    },
    release() {},
  }
  return { pool: { connect: async () => db } as unknown as Pool, queries }
}

test('client status returns all clients and only the authenticated user assignments', async () => {
  const client = { id: 'client', office_id: 'office', client_name: '업체' }
  const assignment = { user_id: 'user', office_id: 'office', client_id: 'client', assignment_role: 'PRIMARY' }
  const other = { id: 'other', office_id: 'office', client_name: '다른 업체' }
  const { pool, queries } = fakePool([
    { ...client, client, assignment }, { ...other, client: other, assignment: null },
  ])
  const result = await createCollectionRepository(pool, 'office', 'user').status()
  assert.deepEqual(result.clients, [client, other])
  assert.deepEqual(result.assignedClients, [{ assignment, client }])
  assert.equal(result.companies.length, 2)
  const query = queries.find(item => item.sql.includes('to_jsonb(c)'))!
  assert.deepEqual(query.params, ['office', 'user'])
  assert.match(query.sql, /a\.user_id = \$2::uuid/)
  assert.match(query.sql, /a\.office_id = c\.office_id/)
  assert.match(query.sql, /c\.office_id = \$1/)
})

test('empty organization returns empty lists', async () => {
  const { pool } = fakePool([])
  const result = await createCollectionRepository(pool, 'office', 'user').status()
  assert.deepEqual(result.clients, [])
  assert.deepEqual(result.assignedClients, [])
})

test('blocked policy rejects client lists and rolls back', async () => {
  const { pool, queries } = fakePool([], true)
  await assert.rejects(createCollectionRepository(pool, 'office', 'user').status(), { code: 'COLLECTION_UNAVAILABLE' })
  assert.ok(queries.some(item => item.sql === 'ROLLBACK'))
  assert.ok(!queries.some(item => item.sql.includes('to_jsonb(c)')))
})

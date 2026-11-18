import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Pool } from 'pg'
import { createClientSummaries, summaryClientId } from '../src/services/client-summaries.js'

test('summaries are restricted to the authenticated office and fixed client', async () => {
  const queries: { sql: string; values?: unknown[] }[] = []
  let released = false
  const db = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql, values })
      if (sql.includes('pg_policy')) return { rows: [{ blocked: false }] }
      if (sql.includes('SELECT id, client_name')) return { rows: [{ id: summaryClientId, name: '대상 업체' }] }
      if (sql.includes('SELECT s.summary_id')) return { rows: [{ sourceId: '9007199254740993', name: '현금입금' }] }
      return { rows: [] }
    }, release: () => { released = true },
  }
  const result = await createClientSummaries({ connect: async () => db } as unknown as Pool)('office-uuid')
  assert.equal(result.summaries.length, 1)
  const list = queries.find(q => q.sql.includes('SELECT s.summary_id'))!
  assert.deepEqual(list.values, [summaryClientId, 'office-uuid'])
  assert.ok(list.sql.includes('a.client_id=s.client_id'))
  assert.ok(list.sql.includes('s.deleted_at IS NULL AND a.deleted_at IS NULL'))
  assert.equal(queries[0]!.sql, 'BEGIN READ ONLY')
  assert.equal(queries.at(-1)!.sql, 'COMMIT')
  assert.equal(released, true)
})
test('a foreign office cannot read the client summaries', async () => {
  let queriedSummaries = false
  let released = false
  const db = {
    query: async (sql: string) => {
      if (sql.includes('SELECT s.summary_id')) queriedSummaries = true
      return { rows: sql.includes('pg_policy') ? [{ blocked: false }] : [] }
    }, release: () => { released = true },
  }
  await assert.rejects(createClientSummaries({ connect: async () => db } as unknown as Pool)('other-office'), { statusCode: 403 })
  assert.equal(queriedSummaries, false)
  assert.equal(released, true)
})
test('database failure is sanitized and the connection released', async () => {
  let released = false
  const db = { query: async (sql: string) => {
    if (sql === 'BEGIN READ ONLY') throw new Error('private database details')
    return { rows: [] }
  }, release: () => { released = true } }
  await assert.rejects(createClientSummaries({ connect: async () => db } as unknown as Pool)('office'), error => {
    assert.ok(error instanceof Error)
    assert.ok(!error.message.includes('private'))
    return true
  })
  assert.equal(released, true)
})

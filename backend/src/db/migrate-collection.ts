import { readFile } from 'node:fs/promises'
import { loadConfig } from '../config/env.js'
import { createPool } from './pool.js'

// 009 자료수집 — 새 테이블만 만든다. 기존 업체 수가 바뀌면 되돌린다.
const config = loadConfig()
if (!config.development || !config.databaseUrl) throw new Error('Local development database required')
const pool = createPool(config.databaseUrl, config.caPath)
try {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    await db.query('SELECT pg_advisory_xact_lock(604110009)')
    const before = await db.query('SELECT count(*)::int AS count FROM public.clients')
    await db.query(await readFile(new URL('../../migrations/009_collection.sql', import.meta.url), 'utf8'))
    const after = await db.query('SELECT count(*)::int AS count FROM public.clients')
    if (before.rows[0].count !== after.rows[0].count) throw new Error('Row count changed')
    await db.query('COMMIT')
    console.log('Collection migration applied; clients preserved:', after.rows[0].count)
  }
  catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    throw error
  }
  finally { db.release() }
}
catch (error) {
  console.error('Collection migration failed:', (error as { code?: string, message?: string }).code ?? (error as Error).message)
  process.exitCode = 1
}
finally { await pool.end() }

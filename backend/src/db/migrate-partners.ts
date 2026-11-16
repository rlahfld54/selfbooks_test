import { readFile } from 'node:fs/promises'
import { loadConfig } from '../config/env.js'
import { createPool } from './pool.js'
const config = loadConfig()
if (!config.development || !config.databaseUrl) throw new Error('Local development database required')
const pool = createPool(config.databaseUrl, config.caPath)
try {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    await db.query('SELECT pg_advisory_xact_lock(604110007)')
    const before = await db.query("SELECT count(*)::int AS count FROM public.tax_offices")
    await db.query(await readFile(new URL('../../migrations/007_tax_office_partners.sql', import.meta.url), 'utf8'))
    const after = await db.query("SELECT count(*)::int AS count FROM public.tax_offices")
    if (before.rows[0].count !== after.rows[0].count) throw new Error('Row count changed')
    await db.query('COMMIT')
    console.log('Partner migration applied; existing row count preserved:', after.rows[0].count)
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    throw error
  } finally { db.release() }
} catch (error) {
  console.error('Partner migration failed:', (error as { code?: string }).code ?? 'connection/schema error')
  process.exitCode = 1
} finally { await pool.end() }

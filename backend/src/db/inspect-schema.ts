import { loadConfig } from '../config/env.js'
import { createPool } from './pool.js'
const config = loadConfig()
if (!config.databaseUrl) throw new Error('Database configuration required')
const pool = createPool(config.databaseUrl, config.caPath)
try {
  const db = await pool.connect()
  try {
    await db.query('BEGIN READ ONLY')
    const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    console.log('TABLES', JSON.stringify(tables.rows))
    console.log('CLIENTS', JSON.stringify((await db.query('SELECT id, client_name FROM public.clients WHERE id = ANY($1::uuid[])', [config.fixtures?.clientIds ?? []])).rows))
    console.log('COLUMNS', JSON.stringify((await db.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows))
    console.log('CONSTRAINTS', JSON.stringify((await db.query("SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid::regclass::text")).rows))
    for (const { tablename } of tables.rows) {
      const name = '"' + tablename.replaceAll('"', '""') + '"'
      console.log('COUNT', tablename, (await db.query(`SELECT count(*)::text AS count FROM public.${name}`)).rows[0].count)
    }
    for (const name of ['accounts', 'fiscal_periods']) {
      if (tables.rows.some(t => t.tablename === name)) console.log('MASTER', name, JSON.stringify((await db.query(`SELECT * FROM public.${name} WHERE client_id = $1 LIMIT 40`, ['20000000-0000-4000-8000-000000000001'])).rows))
    }
    await db.query('ROLLBACK')
  } finally { db.release() }
} catch (error) {
  console.error('Read-only inspection failed:', (error as { code?: string }).code ?? 'connection/query error')
  process.exitCode = 1
} finally { await pool.end() }

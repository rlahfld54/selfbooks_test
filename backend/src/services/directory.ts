import type { Pool, PoolClient } from 'pg'

export type FixtureScope = { officeId: string; clientIds: string[] }
export class DirectoryUnavailable extends Error {}

const clientColumns = `id, office_id AS "officeId", client_name AS name,
  taxpayer_kind AS "taxpayerKind", status`

async function readFixtures<T>(pool: Pool, read: (db: PoolClient) => Promise<T>) {
  const db = await pool.connect()
  let discard = false
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    // Keep the policy check and fixture reads under the same table locks.
    await db.query('LOCK TABLE public.clients, public.tax_offices IN ACCESS SHARE MODE')
    const access = await db.query<{ blocked: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy
        WHERE polrelid IN ('public.clients'::regclass, 'public.tax_offices'::regclass)
          AND NOT pg_catalog.row_security_active(polrelid)
      ) AS blocked
    `)
    if (access.rows[0]?.blocked !== false) throw new DirectoryUnavailable()
    const result = await read(db)
    await db.query('COMMIT')
    return result
  } catch (error) {
    discard = true
    await db.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    db.release(discard)
  }
}

export function createDirectory(pool: Pool, scope: FixtureScope) {
  return {
    clients: () => readFixtures(pool, async (db) => (await db.query(`
      SELECT ${clientColumns}
      FROM public.clients
      WHERE office_id = $1 AND id = ANY($2::uuid[])
      ORDER BY client_name, id
    `, [scope.officeId, scope.clientIds])).rows),
    client: (id: string) => readFixtures(pool, async (db) => (await db.query(`
      SELECT ${clientColumns}
      FROM public.clients
      WHERE office_id = $1 AND id = ANY($2::uuid[]) AND id = $3
    `, [scope.officeId, scope.clientIds, id])).rows[0]),
    taxOffices: () => readFixtures(pool, async (db) => (await db.query(`
      SELECT id, name FROM public.tax_offices WHERE id = $1
    `, [scope.officeId])).rows),
  }
}

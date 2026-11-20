import type { Pool, PoolClient } from "pg";

export type FixtureScope = { officeId: string; clientIds: string[] };
export class DirectoryUnavailable extends Error {}

const clientColumns = `*,
  office_id AS "officeId",
  client_name AS name,
  taxpayer_kind AS "taxpayerKind",
  (SELECT json_build_object('userId', a.user_id, 'name', u.name)
   FROM public.client_assignments a
   JOIN public.users u ON u.id = a.user_id
   WHERE a.office_id = clients.office_id AND a.client_id = clients.id
     AND a.assignment_role = 'PRIMARY'
   ORDER BY a.created_at, a.user_id
   LIMIT 1) AS "primaryAssignment"`;

async function readFixtures<T>(
  pool: Pool,
  read: (db: PoolClient) => Promise<T>,
) {
  const db = await pool.connect();
  let discard = false;
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    // Keep the policy check and fixture reads under the same table locks.
    await db.query(
      "LOCK TABLE public.clients, public.tax_offices, public.client_assignments, public.users IN ACCESS SHARE MODE",
    );
    const access = await db.query<{ blocked: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy
        WHERE polrelid IN ('public.clients'::regclass, 'public.tax_offices'::regclass,
                          'public.client_assignments'::regclass, 'public.users'::regclass)
          AND NOT pg_catalog.row_security_active(polrelid)
      ) AS blocked
    `);
    if (access.rows[0]?.blocked !== false) throw new DirectoryUnavailable();
    const result = await read(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    discard = true;
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release(discard);
  }
}

export function createDirectory(pool: Pool, scope: FixtureScope) {
  return {
    clients: () =>
      readFixtures(
        pool,
        async (db) =>
          (
            await db.query(
              `
      SELECT ${clientColumns}
      FROM public.clients
      WHERE office_id = $1
ORDER BY client_name, id
`,
              [scope.officeId],
            )
          ).rows,
      ),
    client: (id: string) =>
      readFixtures(
        pool,
        async (db) =>
          (
            await db.query(
              `
      SELECT ${clientColumns}
      FROM public.clients
      WHERE office_id = $1 AND id = $2
    `,
              [scope.officeId, id],
            )
          ).rows[0],
      ),
    taxOffices: () =>
      readFixtures(
        pool,
        async (db) =>
          (
            await db.query(
              `
      SELECT id, name FROM public.tax_offices WHERE id = $1
    `,
              [scope.officeId],
            )
          ).rows,
      ),
  };
}

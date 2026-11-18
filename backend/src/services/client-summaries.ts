import type { Pool } from 'pg'
import { AuthError } from './auth.js'
import { DirectoryUnavailable } from './directory.js'

// User-selected client; UI company IDs are not accepted as authorization.
export const summaryClientId = '70b03d21-cf5d-4ac2-b479-06aff24385bc'
export function createClientSummaries(pool: Pool) {
  return async (officeId: string) => {
    const db = await pool.connect()
    try {
      await db.query('BEGIN READ ONLY')
      await db.query('LOCK TABLE public.clients, public.fi_account, public.fi_summary IN ACCESS SHARE MODE')
      const policy = await db.query(`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_policy
        WHERE polrelid IN ('public.clients'::regclass,'public.fi_account'::regclass,'public.fi_summary'::regclass)
        AND NOT pg_catalog.row_security_active(polrelid)) AS blocked`)
      if (policy.rows[0]?.blocked !== false) throw new DirectoryUnavailable()
      const client = await db.query('SELECT id, client_name AS name FROM public.clients WHERE id=$1 AND office_id=$2', [summaryClientId, officeId])
      if (!client.rows[0]) throw new AuthError(403, 'CLIENT_ACCESS_DENIED', '적요 조회 대상 수임업체의 사무소 접근 권한을 확인하세요.')
      const rows = await db.query(`SELECT s.summary_id::text AS "sourceId",
        s.summary_code::text AS code, s.summary_no AS "summaryNo",
        s.summary_text AS name, s.summary_type_code AS "typeCode",
        s.transaction_element_code AS "transactionElementCode", s.is_active AS "isActive",
        a.account_id::text AS "accountSourceId", a.account_default_id::text AS "accountDefaultId",
        a.account_code::text AS "accountCode", a.account_name AS "accountName"
        FROM public.fi_summary s
        JOIN public.fi_account a ON a.account_id=s.account_id AND a.client_id=s.client_id
        JOIN public.clients c ON c.id=s.client_id
        WHERE c.id=$1 AND c.office_id=$2 AND s.deleted_at IS NULL AND a.deleted_at IS NULL
        ORDER BY s.sort_order, s.summary_code NULLS LAST, s.summary_id`, [summaryClientId, officeId])
      await db.query('COMMIT')
      return { client: client.rows[0] as { id: string; name: string }, summaries: rows.rows }
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      if (error instanceof AuthError) throw error
      throw new DirectoryUnavailable()
    } finally { db.release() }
  }
}

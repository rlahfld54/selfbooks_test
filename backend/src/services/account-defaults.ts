import type { Pool } from 'pg'
import { DirectoryUnavailable } from './directory.js'

// Global default master: no company/office columns. Never accepts client scope.
export function createAccountDefaults(pool: Pool) {
  return async () => {
    const db = await pool.connect()
    try {
      await db.query('BEGIN READ ONLY')
      await db.query('LOCK TABLE public.fi_account_default IN ACCESS SHARE MODE')
      const policies = await db.query(`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_policy
        WHERE polrelid='public.fi_account_default'::regclass
        AND NOT pg_catalog.row_security_active(polrelid)) AS blocked`)
      if (policies.rows[0]?.blocked !== false) throw new DirectoryUnavailable()
      const result = await db.query(`SELECT account_default_id::text AS "sourceId",
        account_code::text AS code, account_name AS name, english_name AS "englishName",
        account_category_code AS "categoryCode", middle_category_code AS subcategory,
        account_nature_code AS attribute, normal_balance AS "normalBalance",
        related_account_code::text AS "relatedAccount", standard_fs_code AS "statementCode",
        fx_method_code AS "fxMethodCode", is_business_vehicle AS "businessCar",
        is_active AS "isActive", is_locked AS "isLocked"
        FROM public.fi_account_default WHERE deleted_at IS NULL
        ORDER BY sort_order, account_code, account_default_id`)
      await db.query('COMMIT')
      return result.rows
    } catch {
      await db.query('ROLLBACK').catch(() => {})
      throw new DirectoryUnavailable()
    } finally { db.release() }
  }
}

import type { Pool } from 'pg'
import { DirectoryUnavailable } from './directory.js'

export function createOfficeRegistration(pool: Pool, officeId: string) {
  return async () => {
    const db = await pool.connect()
    try {
      await db.query('BEGIN READ ONLY')
      await db.query('LOCK TABLE public.tax_offices IN ACCESS SHARE MODE')
      const policies = await db.query(`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_policy
        WHERE polrelid='public.tax_offices'::regclass
        AND NOT pg_catalog.row_security_active(polrelid)) AS blocked`)
      if (policies.rows[0]?.blocked !== false) throw new DirectoryUnavailable()
      const result = await db.query(`SELECT id, name, business_registration_number,
        corporate_registration_number, address, business_type, business_item,
        representative_name, co_representatives, representative_phone, head_office,
        branches, additional_workplaces, taxation_type, jurisdiction_tax_office,
        tax_contact_name, refund_bank_name, refund_account_number, refund_account_holder,
        business_memo, basic_info_reviewed_at, representative_info_reviewed_at,
        workplace_info_reviewed_at, tax_info_reviewed_at, memo_reviewed_at
        FROM public.tax_offices WHERE id=$1`, [officeId])
      await db.query('COMMIT')
      return result.rows[0] ?? null
    } catch {
      await db.query('ROLLBACK').catch(() => {})
      throw new DirectoryUnavailable()
    } finally { db.release() }
  }
}

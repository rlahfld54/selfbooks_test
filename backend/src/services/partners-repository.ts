import { createHash } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { SalesError } from './sales-validation.js'
import { digits, partnerIssues, partnerKey, type PartnerImport } from './partners-validation.js'

const columns = {
  registration: 'business_registration_number', businessType: 'business_kind',
  corporationNumber: 'corporate_registration_number', name: 'name', representative: 'representative_name',
  industryCode: 'industry_code', businessCategory: 'business_type', industry: 'business_item',
  postalCode: 'postal_code', address: 'address', addressDetail: 'address_detail',
  contactName: 'contact_name', phone: 'contact_phone', email: 'contact_email', mobile: 'contact_mobile', code: 'partner_code',
} as const

export function partnerRecord(row: Record<string, any>) {
  const information: Record<string, string> = Object.fromEntries(Object.entries(columns).map(([key, column]) => [key, row[column] ?? '']))
  // Existing office phone/email describe the office, not its individual contact.
  Object.assign(information, row.import_information ?? {})
  const issues: string[] = row.import_issues ?? []
  return { id: row.id as string, name: information.name || '(거래처명 없음)', code: information.code || '',
    registration: information.registration || '', contact: information.phone || information.mobile || '—',
    status: issues.length ? '확인요망' : '거래 중', amount: '', date: '—', information,
    importIssues: issues, sourceLine: row.import_source_line ?? 0 }
}

export function createPartnersRepository(pool: Pool, officeId: string, userId: string) {
  async function transaction<T>(write: boolean, work: (db: PoolClient) => Promise<T>) {
    const db = await pool.connect()
    try {
      await db.query(write ? 'BEGIN' : 'BEGIN READ ONLY')
      await db.query('LOCK TABLE public.tax_offices IN ACCESS SHARE MODE')
      const policy = await db.query(`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_policy
        WHERE polrelid='public.tax_offices'::regclass AND NOT pg_catalog.row_security_active(polrelid)) AS blocked`)
      if (policy.rows[0]?.blocked !== false) throw new SalesError(503, 'PARTNERS_UNAVAILABLE', '거래처 접근 정책을 확인하세요.')
      const owner = await db.query(`SELECT id FROM public.tax_offices WHERE id=$1${write ? ' FOR SHARE' : ''}`, [officeId])
      if (!owner.rows.length) throw new SalesError(503, 'PARTNERS_UNAVAILABLE', '서버의 관리 사무소 설정을 확인하세요.')
      const result = await work(db)
      await db.query('COMMIT')
      return result
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      if (['42703', '42P01'].includes((error as { code?: string }).code ?? ''))
        throw new SalesError(503, 'PARTNERS_SCHEMA_REQUIRED', '거래처 DB 마이그레이션을 적용해 주세요.')
      throw error
    } finally { db.release() }
  }
  async function read(db: PoolClient) {
    const result = await db.query(`SELECT * FROM public.tax_offices
      WHERE id=$1 OR managed_by_office_id=$1 ORDER BY created_at, import_source_line NULLS FIRST, id`, [officeId])
    return result.rows.map(partnerRecord)
  }
  return {
    list: () => transaction(false, read),
    insert: (input: PartnerImport) => transaction(true, async db => {
      // Serialize imports per management scope so duplicate diagnostics see committed rows.
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 7))', [officeId])
      const hash = createHash('sha256').update(JSON.stringify(input.rows)).digest('hex')
      const previous = await db.query(`SELECT * FROM public.tax_offices
        WHERE managed_by_office_id=$1 AND import_batch_id=$2 ORDER BY import_source_line`, [officeId, input.batchId])
      if (previous.rows.length) {
        if (previous.rows.length !== input.rows.length || previous.rows.some(row => row.import_batch_hash !== hash))
          throw new SalesError(409, 'IMPORT_CONFLICT', '이미 사용한 업로드 식별자입니다. 파일을 다시 선택하세요.')
        return previous.rows.map(partnerRecord)
      }
      const existing = await read(db)
      const keys = new Set(existing.map(row => partnerKey(row.information)))
      const codes = new Set(existing.map(row => row.code).filter(Boolean))
      const reserved = new Set([...codes, ...input.rows.map(row => row.information.code).filter(Boolean)])
      let sequence = 1
      const records = input.rows.map(row => {
        const info = { ...row.information }
        if (!info.code) {
          do { info.code = `IMP${String(sequence++).padStart(5, '0')}` } while (reserved.has(info.code))
          reserved.add(info.code)
        }
        const issues = [...new Set([...row.importIssues, ...partnerIssues(info, keys, codes)])]
        const record: Record<string, unknown> = Object.fromEntries(Object.entries(columns).map(([key, column]) => [column, info[key] || null]))
        record.name = info.name?.trim() || '(거래처명 없음)'
        record.business_registration_number = /^\d{10}$/.test(digits(info.registration)) ? digits(info.registration) : null
        record.corporate_registration_number = /^\d{13}$/.test(digits(info.corporationNumber)) ? digits(info.corporationNumber) : null
        record.business_kind = ['1', '개인', '개인사업자'].includes(info.businessType ?? '') ? '1' : ['2', '법인', '법인사업자'].includes(info.businessType ?? '') ? '2' : null
        return { ...record, import_information: info, import_issues: issues, import_source_line: row.sourceLine }
      })
      const result = await db.query(`INSERT INTO public.tax_offices (
        managed_by_office_id, imported_by, import_batch_id, import_batch_hash,
        ${Object.values(columns).join(', ')}, import_information, import_issues, import_source_line)
        SELECT $1, $2, $3, $4, ${Object.values(columns).map(column => `x.${column}`).join(', ')},
          x.import_information, x.import_issues, x.import_source_line
        FROM jsonb_to_recordset($5::jsonb) AS x(
          ${Object.values(columns).map(column => `${column} text`).join(', ')},
          import_information jsonb, import_issues jsonb, import_source_line integer)
        RETURNING *`, [officeId, userId, input.batchId, hash, JSON.stringify(records)])
      return result.rows.map(partnerRecord)
    }),
  }
}
export type PartnersRepository = ReturnType<typeof createPartnersRepository>

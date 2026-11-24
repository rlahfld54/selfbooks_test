import type { Pool, PoolClient } from 'pg'
import { SalesError } from './sales-validation.js'

// 계정별 집계 (재무상태표 · 손익계산서 · 합계잔액시산표가 같이 쓴다)
export interface LedgerBalanceRow {
  code: number
  name: string
  engName: string
  category: string
  middle: string
  nature: string
  normalBalance: string
  openDebit: string
  openCredit: string
  debit: string
  credit: string
}

export interface LedgerBalances {
  clientId: string
  clientName: string
  taxpayerKind: string
  from: string
  to: string
  lines: number
  rows: LedgerBalanceRow[]
}

const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export function validateRange(from: unknown, to: unknown) {
  if (typeof from !== 'string' || !datePattern.test(from) || typeof to !== 'string' || !datePattern.test(to) || from > to) {
    throw new SalesError(400, 'INVALID_REQUEST', '조회 기간을 확인해 주세요.')
  }
  return { from, to }
}

export function createLedgerRepository(pool: Pool, officeId: string, defaultClientId: string) {
  async function read<T>(work: (db: PoolClient) => Promise<T>) {
    const db = await pool.connect()
    try {
      await db.query('BEGIN READ ONLY')
      const result = await work(db)
      await db.query('COMMIT')
      return result
    }
    catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      throw error
    }
    finally {
      db.release()
    }
  }

  // 기초 = from 이전 전표, 발생 = from ~ to 전표. 금액은 문자열(numeric 그대로)로 보낸다
  async function balances(clientId: string | undefined, from: string, to: string): Promise<LedgerBalances> {
    const id = clientId || defaultClientId
    return read(async (db) => {
      const client = await db.query<{ client_name: string, taxpayer_kind: string | null }>(
        'SELECT client_name, taxpayer_kind FROM public.clients WHERE id = $1 AND office_id = $2', [id, officeId])
      if (!client.rows[0]) throw new SalesError(404, 'CLIENT_NOT_FOUND', '사업체를 찾을 수 없습니다.')

      const { rows } = await db.query(`
        SELECT a.account_code AS code, a.account_name AS name, COALESCE(a.english_name, '') AS "engName",
               COALESCE(a.account_category_code, '') AS category, COALESCE(a.middle_category_code, '') AS middle,
               COALESCE(a.account_nature_code, '') AS nature, COALESCE(a.normal_balance, '') AS "normalBalance",
               COALESCE(SUM(l.debit) FILTER (WHERE e.entry_date < $3), 0)::text AS "openDebit",
               COALESCE(SUM(l.credit) FILTER (WHERE e.entry_date < $3), 0)::text AS "openCredit",
               COALESCE(SUM(l.debit) FILTER (WHERE e.entry_date >= $3), 0)::text AS debit,
               COALESCE(SUM(l.credit) FILTER (WHERE e.entry_date >= $3), 0)::text AS credit
        FROM public.fi_account a
        LEFT JOIN public.journal_lines l ON l.office_id = $1 AND l.client_id = a.client_id AND l.account_id = a.account_id
        LEFT JOIN public.journal_entries e ON e.office_id = l.office_id AND e.client_id = l.client_id AND e.id = l.entry_id AND e.entry_date <= $4
        WHERE a.client_id = $2 AND a.deleted_at IS NULL
        GROUP BY a.account_id, a.account_code, a.account_name, a.english_name, a.account_category_code,
                 a.middle_category_code, a.account_nature_code, a.normal_balance
        ORDER BY a.account_code`, [officeId, id, from, to])

      const count = await db.query<{ n: string }>(`
        SELECT count(*)::text AS n FROM public.journal_lines l
        JOIN public.journal_entries e ON e.office_id = l.office_id AND e.client_id = l.client_id AND e.id = l.entry_id
        WHERE l.office_id = $1 AND l.client_id = $2 AND e.entry_date BETWEEN $3 AND $4`, [officeId, id, from, to])

      return {
        clientId: id,
        clientName: client.rows[0].client_name,
        taxpayerKind: client.rows[0].taxpayer_kind ?? '',
        from,
        to,
        lines: Number(count.rows[0]?.n ?? 0),
        rows: rows.map(row => ({ ...row, code: Number(row.code) })) as LedgerBalanceRow[],
      }
    })
  }

  return { balances }
}

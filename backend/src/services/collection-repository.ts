import type { Pool } from 'pg'
import { SalesError } from './sales-validation.js'

/*
 * 자료수집 현황 — 공용 DB 의 수임 사업체(public.clients)를 읽어 화면에 뿌린다. **읽기 전용이다.**
 *
 * 아직 DB 에 없는 것:
 *   · 업체별 홈택스 계정(아이디 · 비밀번호) — 저장 위치 미정이라 모두 「계정 미등록」
 *   · 수집 이력 · 수집 자료 테이블 — 마이그레이션 전이라 칸은 모두 「미수집」, 자료 · 이력은 빈 목록
 * 그래서 수집 실행(runs)은 503 으로 사유만 알린다. 홈택스에 접속하지 않는다.
 */

/** 화면 types.ts 의 COLLECTION_KINDS 와 같은 순서 */
export const COLLECTION_KIND_TYPES = ['bizinfo', 'tax', 'invoice', 'cash', 'cardzero', 'ptax', 'pinvoice', 'pcash', 'pcard'] as const

export const COLLECTION_NOT_READY = '홈택스 수집은 아직 연결 전입니다. 업체별 홈택스 계정 저장 위치와 수집 테이블을 정한 뒤 켭니다.'

export interface CollectionCompanyRow {
  clientId: string
  name: string
  bizNo: string
  ceo: string
  manager: string
  hometaxReady: boolean
  hometaxId: string | null
  cells: Record<string, { kind: string, status: 'none', collectedAt: null, count: null }>
}

const emptyCells = () => Object.fromEntries(COLLECTION_KIND_TYPES.map(kind => [kind, { kind, status: 'none' as const, collectedAt: null, count: null }]))

export function toCollectionCompany(row: { id: string, client_name: string, business_registration_number: string | null, representative_name: string | null, manager: string | null }): CollectionCompanyRow {
  return {
    clientId: row.id,
    name: row.client_name,
    bizNo: row.business_registration_number ?? '',
    ceo: row.representative_name ?? '',
    manager: row.manager ?? '',
    hometaxReady: false,
    hometaxId: null,
    cells: emptyCells(),
  }
}

export function createCollectionRepository(pool: Pool, officeId: string) {
  return {
    async status() {
      const db = await pool.connect()
      try {
        await db.query('BEGIN READ ONLY')
        const policy = await db.query<{ blocked: boolean }>(`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_policy
          WHERE polrelid='public.clients'::regclass AND NOT pg_catalog.row_security_active(polrelid)) AS blocked`)
        if (policy.rows[0]?.blocked !== false) throw new SalesError(503, 'COLLECTION_UNAVAILABLE', '수임 사업체 접근 정책을 확인하세요.')
        // 담당자 — 주 담당(PRIMARY) 한 명. 없으면 빈칸(화면은 「미지정」)
        const { rows } = await db.query(`
          SELECT c.id, c.client_name, c.business_registration_number, c.representative_name,
                 (SELECT u.name FROM public.client_assignments a JOIN public.users u ON u.id = a.user_id
                   WHERE a.client_id = c.id AND a.office_id = c.office_id AND a.assignment_role = 'PRIMARY'
                   ORDER BY a.created_at LIMIT 1) AS manager
          FROM public.clients c
          WHERE c.office_id = $1
          ORDER BY c.client_name, c.id`, [officeId])
        await db.query('COMMIT')
        return { companies: rows.map(toCollectionCompany), sample: false }
      }
      catch (error) {
        await db.query('ROLLBACK').catch(() => {})
        throw error
      }
      finally {
        db.release()
      }
    },
  }
}

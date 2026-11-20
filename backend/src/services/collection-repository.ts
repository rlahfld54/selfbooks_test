import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { SalesError } from './sales-validation.js'
import { decryptSecret, encryptSecret, CredentialKeyMissing } from './credential-crypto.js'
import { createScrapClient, ScrapFailure, type ScrapKind, type ScrapRow } from './hometax-scrap.js'

/*
 * 자료수집 현황 — 공용 DB 의 수임 사업체(public.clients) + 009 마이그레이션의 수집 테이블.
 *   client_hometax_accounts  업체별 홈택스 계정(비밀번호 · 주민번호 조각은 암호문)
 *   collection_requests      수집 요청 1건 = 업체 1 × 종류 1 (이력 · 진행 상태)
 *   collection_rows          받은 자료 (같은 원본은 덮어쓴다)
 * 수집은 팀장님 스크랩 API(services/hometax-scrap.ts)로만 한다.
 */

/** 화면 types.ts 의 COLLECTION_KINDS 와 같은 순서 */
export const COLLECTION_KIND_TYPES = ['bizinfo', 'tax', 'invoice', 'cash', 'cardzero', 'ptax', 'pinvoice', 'pcash', 'pcard'] as const
type Kind = typeof COLLECTION_KIND_TYPES[number]
const isKind = (value: string): value is Kind => (COLLECTION_KIND_TYPES as readonly string[]).includes(value)

const KIND_LABEL: Record<Kind, string> = {
  bizinfo: '사업자 상태조회', tax: '전자세금계산서 매출', invoice: '전자계산서 매출', cash: '현금영수증 매출', cardzero: '신용카드 매출',
  ptax: '전자세금계산서 매입', pinvoice: '전자계산서 매입', pcash: '현금영수증 매입', pcard: '신용카드 매입',
}
/** 화면 표 칸에 세는 자료 종류 — 신용카드 매출 칸은 같은 요청으로 받는 판매대행 2종까지 센다 */
const ROW_KINDS_OF: Record<Kind, string[]> = {
  bizinfo: [], tax: ['tax'], invoice: ['invoice'], cash: ['cash'], cardzero: ['cardzero', 'cardagent', 'etcagent'],
  ptax: ['ptax'], pinvoice: ['pinvoice'], pcash: ['pcash'], pcard: ['pcard'],
}

export interface CollectionCompanyRow {
  clientId: string
  name: string
  bizNo: string
  ceo: string
  manager: string
  hometaxReady: boolean
  hometaxId: string | null
  cells: Record<string, { kind: string, status: string, collectedAt: string | null, count: number | null, message?: string }>
}

const emptyCells = () => Object.fromEntries(COLLECTION_KIND_TYPES.map(kind => [kind, { kind, status: 'none', collectedAt: null, count: null }]))

export function toCollectionCompany(row: { id: string, client_name: string, business_registration_number: string | null, representative_name: string | null, manager: string | null, hometax_id?: string | null }): CollectionCompanyRow {
  return {
    clientId: row.id,
    name: row.client_name,
    bizNo: row.business_registration_number ?? '',
    ceo: row.representative_name ?? '',
    manager: row.manager ?? '',
    hometaxReady: !!row.hometax_id,
    hometaxId: row.hometax_id ?? null,
    cells: emptyCells(),
  }
}

/** 같은 업체를 동시에 두 번 수집하지 않는다 — 요청마다 저장소를 새로 만들므로 모듈에 둔다 */
const busy = new Set<string>()

export interface StartInput { clientIds: string[], kinds: string[], from: string, to: string, full?: boolean }
export interface AccountInput { hometaxId: string, password?: string, juminFront6?: string, juminLast1?: string }

const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

export function validateStart(body: unknown): StartInput {
  const input = (body ?? {}) as Record<string, unknown>
  const clientIds = Array.isArray(input.clientIds) ? input.clientIds.filter((id): id is string => typeof id === 'string') : []
  const kinds = Array.isArray(input.kinds) ? input.kinds.filter((kind): kind is string => typeof kind === 'string' && isKind(kind)) : []
  if (!clientIds.length || clientIds.length > 200 || !kinds.length) throw new SalesError(400, 'INVALID_REQUEST', '수집할 사업체와 자료를 하나 이상 골라 주세요.')
  if (!isDate(input.from) || !isDate(input.to) || input.from > input.to) throw new SalesError(400, 'INVALID_REQUEST', '조회기간을 확인해 주세요.')
  return { clientIds: [...new Set(clientIds)], kinds: COLLECTION_KIND_TYPES.filter(kind => kinds.includes(kind)), from: input.from, to: input.to, full: input.full === true }
}

export function validateAccount(body: unknown): AccountInput {
  const input = (body ?? {}) as Record<string, unknown>
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
  const hometaxId = text(input.hometaxId)
  const password = typeof input.password === 'string' ? input.password : ''
  const juminFront6 = text(input.juminFront6)
  const juminLast1 = text(input.juminLast1)
  if (!hometaxId || hometaxId.length > 50) throw new SalesError(400, 'INVALID_REQUEST', '홈택스 아이디를 확인해 주세요.')
  if (password.length > 100) throw new SalesError(400, 'INVALID_REQUEST', '비밀번호가 너무 깁니다.')
  if (juminFront6 && !/^\d{6}$/.test(juminFront6)) throw new SalesError(400, 'INVALID_REQUEST', '주민번호 앞 6자리를 확인해 주세요.')
  if (juminLast1 && !/^\d$/.test(juminLast1)) throw new SalesError(400, 'INVALID_REQUEST', '주민번호 뒤 1자리를 확인해 주세요.')
  return { hometaxId, ...(password ? { password } : {}), ...(juminFront6 ? { juminFront6 } : {}), ...(juminLast1 ? { juminLast1 } : {}) }
}

export function createCollectionRepository(pool: Pool, officeId: string, userId?: string) {
  async function read<T>(work: (db: PoolClient) => Promise<T>) {
    const db = await pool.connect()
    try {
      await db.query('BEGIN READ ONLY')
      const policy = await db.query<{ blocked: boolean }>(`SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_policy
        WHERE polrelid IN ('public.clients'::regclass, 'public.client_assignments'::regclass) AND NOT pg_catalog.row_security_active(polrelid)) AS blocked`)
      if (policy.rows[0]?.blocked !== false) throw new SalesError(503, 'COLLECTION_UNAVAILABLE', '수임 사업체 접근 정책을 확인하세요.')
      const result = await work(db)
      await db.query('COMMIT')
      return result
    }
    catch (error) {
      await db.query('ROLLBACK').catch(() => {})
      if ((error as { code?: string }).code === '42P01') throw new SalesError(503, 'COLLECTION_NOT_MIGRATED', '자료수집 테이블이 아직 없습니다. 009 마이그레이션을 먼저 적용해 주세요.')
      throw error
    }
    finally { db.release() }
  }

  async function ownClients(ids: string[]) {
    const { rows } = await pool.query(`SELECT c.id, c.client_name, c.business_registration_number FROM public.clients c
      WHERE c.office_id = $1 AND c.id = ANY($2::uuid[])`, [officeId, ids])
    return rows as { id: string, client_name: string, business_registration_number: string | null }[]
  }

  /* ── 조회 ── */

  async function status() {
    return read(async (db) => {
      // 009 마이그레이션 전이어도 업체 목록은 보인다(칸은 모두 미수집 · 계정 미등록)
      const ready = (await db.query(`SELECT to_regclass('public.collection_requests') IS NOT NULL AND to_regclass('public.client_hometax_accounts') IS NOT NULL
        AND to_regclass('public.collection_rows') IS NOT NULL AS ready`)).rows[0]?.ready === true
      const { rows } = await db.query(`
        SELECT c.id, c.client_name, c.business_registration_number, c.representative_name,
               to_jsonb(c) || jsonb_build_object('primaryAssignment',
                 (SELECT jsonb_build_object('userId', a.user_id, 'name', u.name)
                  FROM public.client_assignments a JOIN public.users u ON u.id = a.user_id
                  WHERE a.office_id = c.office_id AND a.client_id = c.id AND a.assignment_role = 'PRIMARY'
                  ORDER BY a.created_at, a.user_id LIMIT 1)) AS client,
               (SELECT to_jsonb(a) FROM public.client_assignments a
                 WHERE a.office_id = c.office_id AND a.client_id = c.id
                   AND a.user_id = $2::uuid) AS assignment,
               ${ready ? 'h.hometax_id' : 'NULL::text AS hometax_id'},
               (SELECT u.name FROM public.client_assignments a JOIN public.users u ON u.id = a.user_id
                 WHERE a.client_id = c.id AND a.office_id = c.office_id AND a.assignment_role = 'PRIMARY'
                 ORDER BY a.created_at LIMIT 1) AS manager
        FROM public.clients c
        ${ready ? 'LEFT JOIN public.client_hometax_accounts h ON h.client_id = c.id AND h.office_id = c.office_id' : ''}
        WHERE c.office_id = $1
        ORDER BY c.client_name, c.id`, [officeId, userId ?? null])
      const companies = rows.map(toCollectionCompany)
      const clients = rows.map(row => row.client)
      const assignedClients = rows.filter(row => row.assignment !== null).map(row => ({
        assignment: row.assignment, client: row.client,
      }))
      if (!ready) return { companies, clients, assignedClients, sample: false }
      const latest = await db.query(`
        SELECT DISTINCT ON (client_id, kind) client_id, kind, status, message, result_count,
               to_char(coalesce(finished_at, requested_at) AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day
        FROM public.collection_requests WHERE office_id = $1
        ORDER BY client_id, kind, requested_at DESC, seq DESC`, [officeId])
      const counts = await db.query(`SELECT client_id, kind, count(*)::int AS n FROM public.collection_rows
        WHERE office_id = $1 GROUP BY client_id, kind`, [officeId])
      const countOf = new Map(counts.rows.map(row => [row.client_id + ':' + row.kind, row.n as number]))
      const byId = new Map(companies.map(company => [company.clientId, company]))
      for (const row of latest.rows) {
        const company = byId.get(row.client_id)
        if (!company || !isKind(row.kind)) continue
        const done = row.status === 'done'
        const count = row.kind === 'bizinfo' ? null : ROW_KINDS_OF[row.kind as Kind].reduce((sum, kind) => sum + (countOf.get(row.client_id + ':' + kind) ?? 0), 0)
        company.cells[row.kind] = {
          kind: row.kind, status: row.status, collectedAt: row.status === 'waiting' || row.status === 'running' ? null : row.day,
          count: done ? count : null, ...(row.message ? { message: row.message } : {}),
        }
      }
      return { companies, clients, assignedClients, sample: false }
    })
  }

  /** 마이그레이션 전이면 빈 목록 — 패널이 오류 대신 「자료 없음」을 보인다 */
  const orEmpty = <T>(work: Promise<T[]>) => work.catch((error) => {
    if (error instanceof SalesError && error.code === 'COLLECTION_NOT_MIGRATED') return [] as T[]
    throw error
  })

  async function rows(clientId: string, from: string, to: string) {
    if (!isDate(from) || !isDate(to)) throw new SalesError(400, 'INVALID_REQUEST', '조회기간을 확인해 주세요.')
    return orEmpty(read(async (db) => {
      const result = await db.query(`
        SELECT id, kind, row_date, partner, partner_biz_no, partner_ceo, item, supply, tax, total, note, deduct, deal_type, units
        FROM public.collection_rows
        WHERE office_id = $1 AND client_id = $2
          AND ((char_length(row_date) = 7 AND row_date BETWEEN left($3, 7) AND left($4, 7))
            OR (char_length(row_date) = 10 AND row_date BETWEEN $3 AND $4))
        ORDER BY row_date, kind LIMIT 20000`, [officeId, clientId, from, to])
      return result.rows.map(row => ({
        id: row.id, kind: row.kind, date: row.row_date, partner: row.partner, item: row.item,
        supply: Number(row.supply), tax: Number(row.tax), total: Number(row.total), note: row.note,
        ...(row.partner_biz_no ? { partnerBizNo: row.partner_biz_no } : {}),
        ...(row.partner_ceo ? { partnerCeo: row.partner_ceo } : {}),
        ...(row.deduct ? { deduct: row.deduct } : {}),
        ...(row.deal_type ? { dealType: row.deal_type } : {}),
        ...(row.units !== null ? { units: row.units } : {}),
      }))
    }))
  }

  async function history(clientId: string) {
    return orEmpty(read(async (db) => {
      const result = await db.query(`
        SELECT r.id, r.client_id, r.kind, r.status, r.login_type, r.result_count, r.message,
               to_char(r.period_from, 'YYYY-MM-DD') AS period_from, to_char(r.period_to, 'YYYY-MM-DD') AS period_to,
               to_char(r.requested_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS requested_at,
               to_char(r.finished_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS finished_at,
               coalesce(u.name, '') AS requester
        FROM public.collection_requests r LEFT JOIN public.users u ON u.id = r.requested_by
        WHERE r.office_id = $1 AND r.client_id = $2 AND r.status IN ('done', 'failed', 'skipped', 'cancelled')
        ORDER BY r.requested_at DESC, r.seq DESC LIMIT 300`, [officeId, clientId])
      return result.rows.map(row => ({
        id: row.id, clientId: row.client_id, kind: row.kind, from: row.period_from, to: row.period_to,
        loginType: row.login_type, status: row.status, count: row.result_count, requester: row.requester,
        requestedAt: row.requested_at, finishedAt: row.finished_at, message: row.message,
      }))
    }))
  }

  async function run(runId: string) {
    const { rows } = await pool.query(`
      SELECT r.id, r.client_id, c.client_name, r.kind, r.status, r.message, r.code, r.result_count, r.duration_ms,
             to_char(r.period_from, 'YYYY-MM-DD') AS period_from, to_char(r.period_to, 'YYYY-MM-DD') AS period_to,
             r.requested_at, r.finished_at
      FROM public.collection_requests r JOIN public.clients c ON c.id = r.client_id
      WHERE r.office_id = $1 AND r.run_id = $2 ORDER BY r.seq`, [officeId, runId])
    if (!rows.length) throw new SalesError(404, 'NOT_FOUND', '작업을 찾을 수 없습니다.')
    const open = rows.some(row => row.status === 'waiting' || row.status === 'running')
    const finished = rows.map(row => row.finished_at).filter(Boolean).sort((a, b) => +a - +b).at(-1)
    return {
      id: runId,
      from: rows.find(row => row.kind !== 'bizinfo')?.period_from ?? rows[0].period_from,
      to: rows.find(row => row.kind !== 'bizinfo')?.period_to ?? rows[0].period_to,
      startedAt: new Date(rows[0].requested_at).toISOString(),
      finishedAt: open ? null : new Date(finished ?? rows[0].requested_at).toISOString(),
      items: rows.map(row => ({
        id: row.id, clientId: row.client_id, clientName: row.client_name, kind: row.kind, status: row.status,
        message: row.message, ...(row.code ? { code: row.code } : {}), count: row.result_count, durationMs: row.duration_ms,
      })),
    }
  }

  /* ── 계정 ── */

  async function saveAccount(clientId: string, input: AccountInput) {
    const [client] = await ownClients([clientId])
    if (!client) throw new SalesError(404, 'NOT_FOUND', '사업체를 찾을 수 없습니다.')
    try {
      const existing = await pool.query('SELECT password_enc FROM public.client_hometax_accounts WHERE client_id = $1 AND office_id = $2', [clientId, officeId])
      if (!input.password && !existing.rows.length) throw new SalesError(400, 'INVALID_REQUEST', '홈택스 비밀번호를 입력해 주세요.')
      await pool.query(`
        INSERT INTO public.client_hometax_accounts (client_id, office_id, hometax_id, password_enc, jumin_front6_enc, jumin_last1_enc, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (client_id) DO UPDATE SET hometax_id = EXCLUDED.hometax_id, password_enc = EXCLUDED.password_enc,
          jumin_front6_enc = EXCLUDED.jumin_front6_enc, jumin_last1_enc = EXCLUDED.jumin_last1_enc,
          updated_by = EXCLUDED.updated_by, updated_at = now()
        WHERE public.client_hometax_accounts.office_id = EXCLUDED.office_id`, [
        clientId, officeId, input.hometaxId,
        input.password ? encryptSecret(input.password) : existing.rows[0].password_enc,
        input.juminFront6 ? encryptSecret(input.juminFront6) : null,
        input.juminLast1 ? encryptSecret(input.juminLast1) : null,
        userId ?? null,
      ])
    }
    catch (error) {
      if (error instanceof CredentialKeyMissing) throw new SalesError(503, 'CREDENTIAL_KEY_MISSING', '서버에 홈택스 계정 암호화 키(HOMETAX_CRED_KEY)가 없습니다.')
      if ((error as { code?: string }).code === '42P01') throw new SalesError(503, 'COLLECTION_NOT_MIGRATED', '자료수집 테이블이 아직 없습니다. 009 마이그레이션을 먼저 적용해 주세요.')
      throw error
    }
    return { clientId, hometaxId: input.hometaxId, hometaxReady: true }
  }

  async function credentialsOf(clientId: string) {
    const { rows } = await pool.query(`SELECT h.hometax_id, h.password_enc, h.jumin_front6_enc, h.jumin_last1_enc, c.business_registration_number
      FROM public.client_hometax_accounts h JOIN public.clients c ON c.id = h.client_id
      WHERE h.client_id = $1 AND h.office_id = $2`, [clientId, officeId])
    const row = rows[0]
    if (!row) return null
    return {
      id: row.hometax_id as string,
      pw: decryptSecret(row.password_enc),
      ...(row.jumin_front6_enc ? { juminFront6: decryptSecret(row.jumin_front6_enc) } : {}),
      ...(row.jumin_last1_enc ? { juminLast1: decryptSecret(row.jumin_last1_enc) } : {}),
      bizNo: String(row.business_registration_number ?? '').replace(/[^0-9]/g, ''),
    }
  }

  /* ── 수집 ── */

  async function setItem(id: string, patch: { status: string, message?: string, code?: string | null, count?: number | null, durationMs?: number | null, finished?: boolean }) {
    await pool.query(`UPDATE public.collection_requests SET status = $2, message = coalesce($3, message), code = $4,
      result_count = $5, duration_ms = $6, finished_at = CASE WHEN $7 THEN now() ELSE finished_at END
      WHERE id = $1 AND status <> 'cancelled'`, [id, patch.status, patch.message ?? null, patch.code ?? null, patch.count ?? null, patch.durationMs ?? null, !!patch.finished])
  }

  async function saveRows(clientId: string, list: ScrapRow[]) {
    const unique = [...new Map(list.map(row => [row.kind + '|' + row.sourceKey, row])).values()]
    for (let i = 0; i < unique.length; i += 1000) {
      const chunk = unique.slice(i, i + 1000)
      const col = <K extends keyof ScrapRow>(key: K) => chunk.map(row => row[key])
      await pool.query(`
        INSERT INTO public.collection_rows (office_id, client_id, kind, source_key, row_date, partner, partner_biz_no, partner_ceo,
          item, supply, tax, total, note, deduct, deal_type, units)
        SELECT $1, $2, t.* FROM unnest($3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[],
          $10::bigint[], $11::bigint[], $12::bigint[], $13::text[], $14::text[], $15::text[], $16::int[])
          AS t(kind, source_key, row_date, partner, partner_biz_no, partner_ceo, item, supply, tax, total, note, deduct, deal_type, units)
        ON CONFLICT (client_id, kind, source_key) DO UPDATE SET row_date = EXCLUDED.row_date, partner = EXCLUDED.partner,
          partner_biz_no = EXCLUDED.partner_biz_no, partner_ceo = EXCLUDED.partner_ceo, item = EXCLUDED.item,
          supply = EXCLUDED.supply, tax = EXCLUDED.tax, total = EXCLUDED.total, note = EXCLUDED.note,
          deduct = EXCLUDED.deduct, deal_type = EXCLUDED.deal_type, units = EXCLUDED.units, collected_at = now()`, [
        officeId, clientId, col('kind'), col('sourceKey'), col('date'), col('partner'), col('partnerBizNo'), col('partnerCeo'),
        col('item'), col('supply'), col('tax'), col('total'), col('note'), col('deduct'), col('dealType'), col('units'),
      ])
    }
    return unique.length
  }

  /** 기간 전체 재수집이 아니면 마지막으로 받은 날 이후만 — 겹치는 날은 덮어쓴다 */
  async function startFrom(clientId: string, kind: Kind, from: string, full: boolean) {
    if (full || kind === 'bizinfo') return from
    const { rows } = await pool.query(`SELECT to_char(max(period_to), 'YYYY-MM-DD') AS last FROM public.collection_requests
      WHERE office_id = $1 AND client_id = $2 AND kind = $3 AND status = 'done'`, [officeId, clientId, kind])
    const last = rows[0]?.last as string | null
    return last && last > from ? last : from
  }

  /** 한 업체 — 로그인 1회, 종류를 차례로. 인증 실패면 남은 종류는 건너뛴다 */
  async function collectCompany(clientId: string, full: boolean) {
    const { rows: items } = await pool.query(`SELECT id, kind, to_char(period_from, 'YYYY-MM-DD') AS period_from, to_char(period_to, 'YYYY-MM-DD') AS period_to
      FROM public.collection_requests WHERE office_id = $1 AND client_id = $2 AND status = 'waiting' ORDER BY requested_at, seq`, [officeId, clientId])
    if (!items.length) return
    busy.add(clientId)
    let session: string | null = null
    let stop: string | null = null
    try {
      const scrap = createScrapClient()
      let credentials: Awaited<ReturnType<typeof credentialsOf>> = null
      try { credentials = await credentialsOf(clientId) }
      catch { stop = '저장된 홈택스 계정을 풀 수 없습니다(서버 암호화 키가 다릅니다). 회사 계정을 다시 저장해 주세요.' }
      const login = async () => {
        if (!credentials) throw new ScrapFailure('홈택스 아이디 · 비밀번호가 등록되어 있지 않습니다. (수집 창에서 계정 저장)', 'NO_CREDENTIALS', 400, true)
        session = await scrap.login(credentials)
        return session
      }
      for (const item of items) {
        const current = await pool.query('SELECT status FROM public.collection_requests WHERE id = $1', [item.id])
        if (current.rows[0]?.status !== 'waiting') continue
        if (stop) {
          await setItem(item.id, { status: 'skipped', message: stop.startsWith('저장된') ? stop : '이전 작업 인증 실패로 건너뜀', finished: true })
          continue
        }
        await setItem(item.id, { status: 'running' })
        const started = Date.now()
        const kind = item.kind as ScrapKind
        try {
          const from = await startFrom(clientId, kind as Kind, item.period_from, full)
          const fetchOnce = async () => scrap.fetchKind(session ?? await login(), kind, from, item.period_to)
          let result
          try { result = await fetchOnce() }
          catch (error) {
            // 세션 만료면 재로그인 후 한 번만 다시
            if (error instanceof ScrapFailure && error.code === 'SESSION_EXPIRED') {
              session = null
              result = await fetchOnce()
            }
            else throw error
          }
          if (result.warning) {
            await setItem(item.id, { status: 'skipped', message: '권한 부족 경고로 건너뜀 (자료 없음과 다름 · 저장 안 함)', durationMs: Date.now() - started, finished: true })
            continue
          }
          if (kind === 'bizinfo') {
            await setItem(item.id, { status: 'done', message: result.info ?? '확인됨', count: 1, durationMs: Date.now() - started, finished: true })
            continue
          }
          const saved = await saveRows(clientId, result.rows)
          await setItem(item.id, { status: 'done', message: saved + '건 저장', count: saved, durationMs: Date.now() - started, finished: true })
        }
        catch (error) {
          const failure = error instanceof ScrapFailure ? error : new ScrapFailure('수집 중 오류가 났습니다.', 'COLLECT_ERROR', 500)
          await setItem(item.id, { status: 'failed', message: failure.message, code: failure.code, durationMs: Date.now() - started, finished: true })
          if (failure.fatal) stop = failure.message
        }
      }
    }
    catch (error) {
      const message = error instanceof ScrapFailure ? error.message : '수집을 시작하지 못했습니다.'
      await pool.query(`UPDATE public.collection_requests SET status = 'failed', message = $3, finished_at = now()
        WHERE office_id = $1 AND client_id = $2 AND status IN ('waiting', 'running')`, [officeId, clientId, message])
    }
    finally {
      busy.delete(clientId)
    }
  }

  async function runQueue(clientIds: string[], full: boolean) {
    const queue = [...clientIds]
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        await collectCompany(next, full).catch(() => {})
      }
    }
    await Promise.all(Array.from({ length: Math.min(2, queue.length) }, worker))
  }

  async function start(input: StartInput) {
    const clients = await ownClients(input.clientIds)
    if (!clients.length) throw new SalesError(400, 'INVALID_REQUEST', '수집할 사업체를 찾을 수 없습니다.')
    const runId = randomUUID()
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)
    let seq = 0
    const values: unknown[] = []
    const tuples: string[] = []
    const queued: string[] = []
    for (const client of clients) {
      const already = busy.has(client.id)
      if (!already) queued.push(client.id)
      for (const kind of input.kinds as Kind[]) {
        const base = values.length
        values.push(officeId, client.id, runId, kind, already ? 'skipped' : 'waiting',
          kind === 'bizinfo' ? today : input.from, kind === 'bizinfo' ? today : input.to,
          already ? '이미 수집 중인 사업체입니다.' : '', seq++, userId ?? null)
        tuples.push(`(${Array.from({ length: 10 }, (_, i) => '$' + (base + i + 1)).join(',')}${already ? ', now()' : ', NULL'})`)
      }
    }
    try {
      await pool.query(`INSERT INTO public.collection_requests (office_id, client_id, run_id, kind, status, period_from, period_to, message, seq, requested_by, finished_at)
        VALUES ${tuples.join(',')}`, values)
    }
    catch (error) {
      if ((error as { code?: string }).code === '42P01') throw new SalesError(503, 'COLLECTION_NOT_MIGRATED', '자료수집 테이블이 아직 없습니다. 009 마이그레이션을 먼저 적용해 주세요.')
      throw error
    }
    void runQueue(queued, input.full === true)
    return run(runId)
  }

  async function cancel(runId: string) {
    await pool.query(`UPDATE public.collection_requests SET status = 'cancelled', message = '사용자가 중단했습니다.', finished_at = now()
      WHERE office_id = $1 AND run_id = $2 AND status = 'waiting'`, [officeId, runId])
    return run(runId)
  }

  async function retry(runId: string, itemId: string) {
    const { rows } = await pool.query(`SELECT client_id, status, code FROM public.collection_requests WHERE office_id = $1 AND run_id = $2 AND id = $3`, [officeId, runId, itemId])
    const item = rows[0]
    if (!item) throw new SalesError(404, 'NOT_FOUND', '작업을 찾을 수 없습니다.')
    if (item.status !== 'failed' || item.code === 'ACCOUNT_LOCKED') throw new SalesError(409, 'NOT_RETRYABLE', '다시 시도할 수 없는 작업입니다.')
    if (busy.has(item.client_id)) throw new SalesError(409, 'BUSY', '이미 수집 중인 사업체입니다.')
    await pool.query(`UPDATE public.collection_requests SET status = 'waiting', message = '', code = NULL, result_count = NULL,
      duration_ms = NULL, finished_at = NULL, requested_at = now() WHERE id = $1`, [itemId])
    void runQueue([item.client_id], false)
    return run(runId)
  }

  return { status, rows, history, run, start, cancel, retry, saveAccount, label: (kind: string) => KIND_LABEL[kind as Kind] ?? kind }
}

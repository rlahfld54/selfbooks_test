/*
 * 팀장님 홈택스 스크랩 API 클라이언트 — 근거: api-guide.xlsx · api-biz-cert.xlsx (2026-11-18 공유).
 * 가이드에 없는 경로는 부르지 않는다. 응답 원문은 로그에 남기지 않는다(상호 · 대표자 · 주민번호 · 구매자 이름).
 *
 * 지킬 것
 *   · BAD_CREDENTIALS · ACCOUNT_LOCKED 는 자동 재시도 금지 (비밀번호 5회 오류 → 계정 잠김)
 *   · 업체당 로그인 1회 → 조회 N회 (세션 유휴 25분). 401(세션 만료)이면 재로그인 후 1회만 재시도
 *   · 응답에 warning 이 있으면 그 0건은 「자료 없음」이 아니다 → 저장하지 않고 건너뜀
 *   · 현금영수증 취소(trsClCd "1")는 금액이 양수라 제외, 신용카드 취소는 음수라 그대로 합산
 *   · 전자(세금)계산서 tnmNm 은 항상 거래 상대방 — 사업자번호는 방향을 보고 고른다
 *   · 사업자등록증명은 basicOnly:true 만 — 기본값은 실제 민원 발급이다
 */

export type ScrapKind = 'bizinfo' | 'tax' | 'invoice' | 'cash' | 'cardzero' | 'ptax' | 'pinvoice' | 'pcash' | 'pcard'
export type RowKind = Exclude<ScrapKind, 'bizinfo'> | 'cardagent' | 'etcagent'

export interface ScrapRow {
  kind: RowKind
  sourceKey: string
  date: string
  partner: string
  partnerBizNo: string
  partnerCeo: string
  item: string
  supply: number
  tax: number
  total: number
  note: string
  deduct: string | null
  dealType: string | null
  units: number | null
}

export interface Credentials { id: string, pw: string, juminFront6?: string, juminLast1?: string, bizNo: string }

/** 화면 · 이력에 남길 오류 — code 가 FATAL 이면 같은 업체의 남은 종류를 건너뛴다 */
export class ScrapFailure extends Error {
  constructor(message: string, public code: string, public status: number, public fatal = false) { super(message) }
}
export const FATAL_CODES = new Set(['BAD_CREDENTIALS', 'ACCOUNT_LOCKED'])

type Json = Record<string, any>
const num = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}
const str = (value: unknown) => value === null || value === undefined ? '' : String(value).trim()
const ymd = (value: string) => value.replace(/-/g, '')
/** 20260602 · 2026-06-02 · 2026-06-02 12:03 → 2026-06-02 */
const day = (value: unknown) => {
  const digits = str(value).replace(/[^0-9]/g, '').slice(0, 8)
  return digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : str(value).slice(0, 10)
}
const month = (value: unknown) => {
  const digits = str(value).replace(/[^0-9]/g, '')
  return digits.length >= 6 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}` : str(value)
}
const digitsOnly = (value: unknown) => str(value).replace(/[^0-9]/g, '')

/* ── 매핑 (순수 함수 — 테스트한다) ─────────────────────── */

export function mapEtax(kind: 'tax' | 'invoice' | 'ptax' | 'pinvoice', items: Json[]): ScrapRow[] {
  const sales = kind === 'tax' || kind === 'invoice'
  return items.map((row): ScrapRow => {
    const classification = str(row.etxivClsfCd)
    return {
      kind,
      sourceKey: str(row.etan) || [row.wrtDt, row.splrTxprDscmNo, row.dmnrTxprDscmNo, row.totaAmt].map(str).join('|'),
      date: day(row.wrtDt),
      partner: str(row.tnmNm),
      // 사업자번호는 방향과 무관하게 정확하다 — 매출이면 공급받는자, 매입이면 공급자가 상대방
      partnerBizNo: digitsOnly(sales ? row.dmnrTxprDscmNo : row.splrTxprDscmNo),
      partnerCeo: str(row.rprsFnm),
      item: str(row.lsatNm),
      supply: num(row.sumSplCft),
      tax: num(row.sumTxamt),
      total: num(row.totaAmt),
      note: classification.includes('수정') ? classification : '',
      deduct: null,
      dealType: null,
      units: null,
    }
  })
}

/** 현금영수증 — 취소(trsClCd "1")는 양수로 와서 제외한다 */
export function mapCash(kind: 'cash' | 'pcash', items: Json[]): ScrapRow[] {
  return items.filter(row => str(row.trsClCd) !== '1').map((row): ScrapRow => ({
    kind,
    sourceKey: [str(row.aprvNo), str(row.trsDt)].join('|'),
    date: day(row.trsDt || row.trsDtm || row.trsDtTime),
    // 매출은 구매자 개인 이름이 들어 있어 저장하지 않는다
    partner: kind === 'pcash' ? str(row.mrntTxprNm) : '',
    partnerBizNo: kind === 'pcash' ? digitsOnly(row.mrntTxprDscmNoEncCntn) : '',
    partnerCeo: '',
    item: '',
    supply: num(row.splCft),
    tax: num(row.vaTxamt),
    total: num(row.totaTrsAmt),
    note: kind === 'cash' ? str(row.cshptUsgClNm) : '',
    deduct: kind === 'pcash' ? (str(row.prhTxamtDdcClNm) || null) : null,
    dealType: str(row.trsClNm) || null,
    units: null,
  }))
}

/** 신용카드 매입 — 취소는 음수 금액으로 와서 그대로 둔다(합산하면 상계된다) */
export function mapCardPurchase(items: Json[]): ScrapRow[] {
  return items.map((row): ScrapRow => ({
    kind: 'pcard',
    sourceKey: str(row.busnCrdcTrsBrkdSn) || [row.aprvDt, row.mrntTxprDscmNoEncCntn, row.totaTrsAmt].map(str).join('|'),
    date: day(row.aprvDt),
    partner: str(row.mrntTxprNm),
    partnerBizNo: digitsOnly(row.mrntTxprDscmNoEncCntn),
    partnerCeo: '',
    item: str(row.tfbNm),
    supply: num(row.splCft),
    tax: num(row.vaTxamt),
    total: num(row.totaTrsAmt),
    note: str(row.vatDdcClNm),
    deduct: str(row.ddcYnNm) || null,
    dealType: null,
    units: null,
  }))
}

/** 신용카드 매출 — 월별 집계 3묶음(카드·제로페이 / 판매대행 카드 / 판매대행 기타) */
export function mapCardSales(data: Json): ScrapRow[] {
  const groups: [string, RowKind][] = [['cardZeropay', 'cardzero'], ['prxCard', 'cardagent'], ['prxEtc', 'etcagent']]
  return groups.flatMap(([key, kind]) => ((data?.[key]?.monthly ?? []) as Json[]).map((row): ScrapRow => ({
    kind,
    sourceKey: `${key}|${str(row.stlYm)}|${str(row.mateKndNm || row.cat)}`,
    date: month(row.stlYm),
    partner: '',
    partnerBizNo: '',
    partnerCeo: '',
    item: str(row.mateKndNm || row.cat) || (kind === 'cardzero' ? '신용카드 자료' : '판매대행'),
    supply: 0,
    tax: 0,
    total: num(row.amt),
    note: '월합계',
    deduct: null,
    dealType: null,
    units: num(row.scnt),
  })))
}

/** 기간 → 신용카드 매출 요청(연도마다 분기 범위) */
export function cardSalesQuarters(from: string, to: string) {
  const quarter = (date: string) => Math.ceil(Number(date.slice(5, 7)) / 3)
  const out: { year: number, qFrom: number, qTo: number }[] = []
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    out.push({
      year,
      qFrom: year === Number(from.slice(0, 4)) ? quarter(from) : 1,
      qTo: year === Number(to.slice(0, 4)) ? quarter(to) : 4,
    })
  }
  return out
}

/* ── HTTP ───────────────────────────────────────────── */

export function createScrapClient(base = process.env.HOMETAX_API_URL, apiKey = process.env.HOMETAX_API_KEY, transport: typeof fetch = fetch) {
  if (!base || !apiKey) throw new ScrapFailure('스크랩 서버 주소 · 키가 서버에 설정되지 않았습니다.', 'SCRAP_NOT_CONFIGURED', 503, true)

  async function call(path: string, body: Json, timeoutMs = 180000): Promise<Json> {
    let response: Response
    try {
      response = await transport(base!.replace(/\/$/, '') + path, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    }
    catch {
      throw new ScrapFailure('스크랩 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'SCRAP_UNREACHABLE', 503)
    }
    const data = await response.json().catch(() => ({})) as Json
    if (response.ok) { return data }
    const code = str(data.code) || (data.maintenance ? 'MAINTENANCE' : data.hometaxError ? 'HOMETAX_ERROR' : response.status === 401 ? 'SESSION_EXPIRED' : 'SCRAP_ERROR')
    const message = code === 'MAINTENANCE' ? '홈택스 점검시간(00~06시)입니다. 06시 이후 다시 시도해 주세요.'
      : code === 'BAD_CREDENTIALS' ? '홈택스 아이디 · 비밀번호 · 주민번호가 맞지 않습니다. 자동으로 다시 시도하지 않습니다(5회 오류 시 계정 잠김).'
        : code === 'ACCOUNT_LOCKED' ? '홈택스 계정이 잠겼습니다(비밀번호 5회 오류). 고객이 홈택스에서 비밀번호를 재발급해야 합니다.'
          : code === 'NO_API_KEY' || code === 'BAD_API_KEY' ? '스크랩 서버 키가 맞지 않습니다. 관리자에게 알려 주세요.'
            : str(data.error) || `스크랩 서버 오류 (${response.status})`
    throw new ScrapFailure(message, code, response.status, FATAL_CODES.has(code) || code === 'NO_API_KEY' || code === 'BAD_API_KEY')
  }

  return {
    async login(credentials: Credentials) {
      const data = await call('/session', {
        id: credentials.id, pw: credentials.pw, bizNo: credentials.bizNo,
        ...(credentials.juminFront6 ? { juminFront6: credentials.juminFront6 } : {}),
        ...(credentials.juminLast1 ? { juminLast1: credentials.juminLast1 } : {}),
      }, 60000)
      if (!data.sessionId) { throw new ScrapFailure('홈택스 로그인 응답에 세션이 없습니다.', 'SCRAP_ERROR', 502) }
      return String(data.sessionId)
    },
    /** 한 종류를 받는다 — warning 이면 null(저장하지 않는다) */
    async fetchKind(sessionId: string, kind: ScrapKind, from: string, to: string): Promise<{ rows: ScrapRow[], warning: string | null, info?: string }> {
      const range = { from: ymd(from), to: ymd(to), all: true }
      if (kind === 'bizinfo') {
        const data = await call('/biz-cert/session', { sessionId, basicOnly: true }, 60000)
        const status = str(data.info?.['납세자상태']) || '확인됨'
        return { rows: [], warning: null, info: status }
      }
      if (kind === 'cardzero') {
        const rows: ScrapRow[] = []
        for (const q of cardSalesQuarters(from, to)) {
          const data = await call('/trades/card', { sessionId, direction: 'sales', ...q })
          if (data.warning) { return { rows: [], warning: str(data.warning) } }
          rows.push(...mapCardSales(data))
        }
        return { rows, warning: null }
      }
      const request: Record<Exclude<ScrapKind, 'bizinfo' | 'cardzero'>, [string, Json]> = {
        tax: ['/trades/etax', { direction: 'sales', docType: 'tax' }],
        invoice: ['/trades/etax', { direction: 'sales', docType: 'plain' }],
        ptax: ['/trades/etax', { direction: 'purchase', docType: 'tax' }],
        pinvoice: ['/trades/etax', { direction: 'purchase', docType: 'plain' }],
        cash: ['/trades/cash', { direction: 'sales' }],
        pcash: ['/trades/cash', { direction: 'purchase' }],
        pcard: ['/trades/card', { direction: 'purchase' }],
      }
      const [path, extra] = request[kind]
      const data = await call(path, { sessionId, ...extra, ...range })
      if (data.warning) { return { rows: [], warning: str(data.warning) } }
      const items = (data.items ?? []) as Json[]
      const rows = kind === 'pcard' ? mapCardPurchase(items)
        : kind === 'cash' || kind === 'pcash' ? mapCash(kind, items)
          : mapEtax(kind, items)
      return { rows, warning: null }
    },
  }
}

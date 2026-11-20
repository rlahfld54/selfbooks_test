import type { ClientRecord, AssignedClient } from '../clients/types'

// 자료수집 현황 — 화면과 서비스가 함께 쓰는 모양.
// 수집 종류는 팀장님 tax-platform `apps/api/src/lib/hometax.ts` 의 KINDS 8종을 그대로 따른다.
// 「기본정보」는 국세청 공개 사업자상태조회라 홈택스 로그인이 필요 없다.

export type CollectionFlow = 'info' | 'sale' | 'purchase'

export interface CollectionKind {
  type: string
  flow: CollectionFlow
  /** 진행 목록에 쓰는 전체 이름 */
  label: string
  /** 표 머리글에 쓰는 짧은 이름 */
  short: string
}

export const COLLECTION_KINDS: readonly CollectionKind[] = [
  { type: 'bizinfo', flow: 'info', label: '사업자 상태조회', short: '기본정보' },
  { type: 'tax', flow: 'sale', label: '전자세금계산서 매출', short: '세금계산서' },
  { type: 'invoice', flow: 'sale', label: '전자계산서 매출', short: '계산서' },
  { type: 'cash', flow: 'sale', label: '현금영수증 매출', short: '현금영수증' },
  // 신용카드 매출 한 번 부르면 신용카드·제로페이 + 판매대행 2종(prxCard · prxEtc)이 같이 온다 — api-guide 7.신용카드매출
  { type: 'cardzero', flow: 'sale', label: '신용카드 매출', short: '신용카드' },
  { type: 'ptax', flow: 'purchase', label: '전자세금계산서 매입', short: '세금계산서' },
  { type: 'pinvoice', flow: 'purchase', label: '전자계산서 매입', short: '계산서' },
  { type: 'pcash', flow: 'purchase', label: '현금영수증 매입', short: '현금영수증' },
  { type: 'pcard', flow: 'purchase', label: '신용카드 매입', short: '신용카드' },
]

export const FLOW_LABEL: Record<CollectionFlow, string> = { info: '기본', sale: '매출', purchase: '매입' }

/**
 * 수집 작업 종류는 아니지만 자료 줄에 붙는 종류 — 신용카드 매출 응답에 같이 오는 판매대행 2종.
 * 이름은 api-guide 의 prxCard(판매대행 - 신용카드) · prxEtc(판매대행 - 기타결제수단).
 */
export const DERIVED_ROW_KINDS: readonly CollectionKind[] = [
  { type: 'cardagent', flow: 'sale', label: '판매대행 신용카드 매출', short: '판매대행 카드' },
  { type: 'etcagent', flow: 'sale', label: '판매대행 기타결제수단 매출', short: '판매대행 기타' },
]

export const kindOf = (type: string) => [...COLLECTION_KINDS, ...DERIVED_ROW_KINDS].find(kind => kind.type === type)

/** 표 한 칸의 상태 */
export type CellStatus = 'none' | 'waiting' | 'running' | 'done' | 'failed' | 'skipped' | 'cancelled'

export const CELL_LABEL: Record<CellStatus, string> = {
  none: '미수집', waiting: '대기', running: '수집 중', done: '완료', failed: '실패', skipped: '건너뜀', cancelled: '중단됨',
}

export interface CollectionCell {
  kind: string
  status: CellStatus
  /** 마지막으로 끝난 날짜 (YYYY-MM-DD) */
  collectedAt: string | null
  count: number | null
  message?: string
}

export interface CollectionCompany {
  clientId: string
  name: string
  bizNo: string
  ceo: string
  manager: string
  /** 회사등록에 홈택스 아이디·비밀번호가 있는지 */
  hometaxReady: boolean
  /**
   * 저장된 홈택스 아이디 — 수집 모달에 그대로 보인다(이지북스 「저장된 계정 · 등록됨」).
   * 비밀번호는 서버가 절대 내려 주지 않는다. 등록 여부만 hometaxReady 로 안다.
   */
  hometaxId?: string | null
  cells: Record<string, CollectionCell>
}

export interface CollectionStatus {
  clients?: ClientRecord[]
  assignedClients?: AssignedClient[]
  companies: CollectionCompany[]
  /** 실제 스크래핑 서버 대신 샘플로 도는지 */
  sample: boolean
}

/** cancelled — 사람이 「중단」을 눌러 시작하지 못한 작업 (이지북스 「중단됨 · 사용자가 중단했습니다」) */
export type RunItemStatus = 'waiting' | 'running' | 'done' | 'failed' | 'skipped' | 'cancelled'

export interface CollectionRunItem {
  id: string
  clientId: string
  clientName: string
  kind: string
  status: RunItemStatus
  message: string
  /** 자동 재시도 금지 코드 (BAD_CREDENTIALS · ACCOUNT_LOCKED 등) */
  code?: string
  count: number | null
  durationMs: number | null
}

export interface CollectionRun {
  id: string
  from: string
  to: string
  startedAt: string
  finishedAt: string | null
  items: CollectionRunItem[]
}

export interface StartRunInput {
  clientIds: string[]
  kinds: string[]
  from: string
  to: string
  /**
   * 기간 전체 재수집 — 이지북스 수집 모달의 같은 체크박스.
   * false 면 서버가 종류별로 이미 받은 마지막 날 이후만 받는다(빠르다). true 면 기간 전체를 다시 받는다.
   */
  full?: boolean
}

/** 업체 홈택스 계정 저장 — 비밀번호는 서버가 암호화해 두고 다시 내려 주지 않는다. 비우면 기존 비밀번호 유지 */
export interface SaveAccountInput {
  hometaxId: string
  password?: string
  /** 계정에 따라 2차 인증에 쓰는 주민번호 앞 6자리 · 뒤 1자리 */
  juminFront6?: string
  juminLast1?: string
}

/** 인증 방식 — 이지북스와 같다. 세무대리 인증서는 스크랩 API 에 아직 없다 */
export type LoginType = 'idpw' | 'cert'
export const LOGIN_TYPE_LABEL: Record<LoginType, string> = { idpw: '홈택스 계정', cert: '세무대리 인증서' }

/**
 * 자료수집 이력 한 줄 — 요청 1건 = 사업체 1 × 종류 1.
 * 이지북스 `GET /api/companies/:seq/scrap-requests` 의 칸과 같다.
 */
export interface CollectionHistoryItem {
  id: string
  clientId: string
  kind: string
  from: string
  to: string
  loginType: LoginType
  status: 'done' | 'failed' | 'skipped' | 'cancelled'
  count: number | null
  /** 요청한 직원 이름 */
  requester: string
  /** 요청 시각 · 끝난 시각 (YYYY-MM-DD HH:mm) */
  requestedAt: string
  finishedAt: string | null
  /** 실패 · 건너뜀 · 중단 사유 */
  message: string
}

/** 수집 자료 한 줄 — 홈택스 원본 칸만 */
export interface CollectedRowSample {
  kind: string
  date: string
  partner: string
  item: string
  supply: number
  tax: number
  total: number
  /** 수정 · 취소 · 월합계 같은 구분 */
  note: string
  /** 국세청 공제여부 원본 (사업용카드 · 현금영수증 매입) */
  deduct?: string
  /** 거래처 사업자번호 (계산서 · 카드 · 현금영수증 매입) */
  partnerBizNo?: string
  /** 거래처 대표자 (세금계산서 · 계산서) */
  partnerCeo?: string
  /** 승인거래 / 취소거래 (현금영수증) */
  dealType?: string
  /** 건수 — 월합계 · 분기합계 자료의 결제건수 */
  units?: number
}

export interface CollectedRow extends CollectedRowSample {
  id: string
}

export interface RowsQuery {
  clientId: string
  from: string
  to: string
}

/**
 * 수집 자료 보기의 자료 종류 — 이지북스 「홈택스 매입매출 자료」 왼쪽 목록 순서.
 * 수출실적명세서 · 화물운전자복지카드는 팀장님 스크랩 API 범위 밖이라 뺐다.
 */
export const ROW_CATEGORIES: readonly { type: string, flow: 'sale' | 'purchase', label: string }[] = [
  { type: 'tax', flow: 'sale', label: '전자세금계산서' },
  { type: 'invoice', flow: 'sale', label: '전자계산서' },
  { type: 'cardzero', flow: 'sale', label: '신용카드' },
  { type: 'cardagent', flow: 'sale', label: '판매결제대행 (신용카드)' },
  { type: 'etcagent', flow: 'sale', label: '판매결제대행 (기타)' },
  { type: 'cash', flow: 'sale', label: '현금영수증' },
  { type: 'ptax', flow: 'purchase', label: '전자세금계산서' },
  { type: 'pinvoice', flow: 'purchase', label: '전자계산서' },
  { type: 'pcard', flow: 'purchase', label: '사업용신용카드' },
  { type: 'pcash', flow: 'purchase', label: '현금영수증' },
]

/** 종류별 표 칸 — 이지북스 화면의 칸 이름을 따른다 */
export type RowField = 'date' | 'partner' | 'partnerBizNo' | 'item' | 'supply' | 'tax' | 'total' | 'note' | 'partnerCeo' | 'deduct' | 'dealType' | 'units'
export interface RowColumn { field: RowField, label: string, num?: boolean }

const C = (field: RowField, label: string, num = false): RowColumn => ({ field, label, num })
const ETAX_COLUMNS = [C('date', '작성일자'), C('partner', '상호(거래처)'), C('partnerBizNo', '사업자번호'), C('item', '품목명'), C('supply', '공급가액', true), C('tax', '세액', true), C('total', '합계금액', true), C('note', '비고'), C('partnerCeo', '대표자')]
export const ROW_COLUMNS: Record<string, RowColumn[]> = {
  tax: ETAX_COLUMNS,
  invoice: ETAX_COLUMNS,
  ptax: ETAX_COLUMNS,
  pinvoice: ETAX_COLUMNS,
  cardzero: [C('date', '결제월'), C('item', '매출종류'), C('units', '결제건수', true), C('total', '합계결제금액', true)],
  cardagent: [C('date', '결제월'), C('partner', '사업자명'), C('units', '결제건수', true), C('total', '결제금액(팁제외)', true)],
  etcagent: [C('date', '결제월'), C('partner', '사업자명'), C('units', '결제건수', true), C('total', '결제금액(팁제외)', true)],
  cash: [C('date', '거래일자'), C('dealType', '거래구분'), C('note', '발급구분'), C('supply', '공급가액', true), C('tax', '세액', true), C('total', '합계', true)],
  pcash: [C('date', '거래일자'), C('dealType', '거래구분'), C('deduct', '매입세액공제'), C('partner', '가맹점(상호)'), C('partnerBizNo', '사업자번호'), C('supply', '공급가액', true), C('tax', '세액', true), C('total', '합계', true)],
  pcard: [C('date', '승인일자'), C('partner', '가맹점(상호)'), C('partnerBizNo', '사업자번호'), C('deduct', '공제'), C('supply', '공급가액', true), C('tax', '세액', true), C('total', '합계', true)],
}

/**
 * 사업체 한 곳의 「자료수집 현황」 줄 — 셀프북스 화면모음 v1-1 자료수집현황(매출 6종 · 매입 5종).
 * 팀장님 tax-platform `routes/scrap.ts` SUMMARY_CARDS 와 같은 순서 · 이름이다.
 * 결제대행 2종은 신용카드 매출(`via: 'cardzero'`) 수집에 같이 온다. 통장은 스크랩 API 에 경로가 없어 「미연동」이다.
 */
export interface SummaryLineDef {
  key: string
  type: string | null
  flow: 'sale' | 'purchase'
  label: string
  isBank?: boolean
  /** 이 줄을 채우는 수집 작업 종류 — 없으면 type 과 같다 */
  via?: string
}

export const SUMMARY_LINES: readonly SummaryLineDef[] = [
  { key: 'stax', type: 'tax', flow: 'sale', label: '전자세금계산서' },
  { key: 'sbill', type: 'invoice', flow: 'sale', label: '전자계산서' },
  { key: 'scard', type: 'cardzero', flow: 'sale', label: '신용카드·제로(온누리)페이' },
  { key: 'scash', type: 'cash', flow: 'sale', label: '현금영수증' },
  { key: 'sagency', type: 'cardagent', via: 'cardzero', flow: 'sale', label: '신용카드결제대행' },
  { key: 'setc', type: 'etcagent', via: 'cardzero', flow: 'sale', label: '기타결제대행' },
  { key: 'ptax', type: 'ptax', flow: 'purchase', label: '전자세금계산서' },
  { key: 'pbill', type: 'pinvoice', flow: 'purchase', label: '전자계산서' },
  { key: 'pcard', type: 'pcard', flow: 'purchase', label: '사업용(법인)카드' },
  { key: 'pcash', type: 'pcash', flow: 'purchase', label: '현금영수증' },
  { key: 'pbank', type: null, flow: 'purchase', label: '통장', isBank: true },
]

export interface SummaryLine extends SummaryLineDef {
  /** 수집 경로가 있는 종류인가 */
  linked: boolean
  count: number
  supply: number
  tax: number
  /** 통장은 공급가액 · 세액 개념이 없어 합계를 내지 않는다 */
  total: number | null
  dstart: string
  dend: string
  /** 마지막 수집 상태 — 미연동 종류는 null */
  cell: CollectionCell | null
}

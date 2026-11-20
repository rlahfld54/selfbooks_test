/*
 * 매입매출전표 상단 그리드(팀장님 front-simple VoucherSale · 셀프북스 화면모음 f8) 규칙.
 * 유형코드 · 26개 탭 · 휴일 색 · 정렬 · 분개유형 번호를 한곳에 둔다.
 * 저장 · 검증 · 자동분개 계산은 salesJournal.ts / voucherCalculation.ts 그대로 쓴다.
 */
import type { SalesRecord, VatType } from './salesJournal.ts'

/** 자료수집 경로 — 전자(홈택스) · 비전자(비전자증빙) · 수기 */
export type Collect = 'e' | 'n' | 'm'
export const COLLECT_LABEL: Record<Collect, string> = { e: '전자', n: '비전자', m: '수기' }
export const COLLECT_FULL: Record<Collect, string> = { e: '전자 수집(홈택스)', n: '비전자 증빙', m: '담당자 직접 입력' }
/** 지금 서버 전표에는 전자 여부만 있어 비전자는 아직 구분하지 못한다 */
export const collectOf = (row: Pick<SalesRecord, 'electronic'>): Collect => (row.electronic ? 'e' : 'm')

/* 화면모음 f8 typeCode 주석의 코드표. 17~19 카드 · 22~24 현금영수증 */
export interface TypeInfo { label: string; flow: 'sale' | 'purchase'; group: string }
export const TYPE_INFO: Record<string, TypeInfo> = {
  11: { label: '11.과세', flow: 'sale', group: 'saletax' },
  12: { label: '12.영세', flow: 'sale', group: 'saletax' },
  13: { label: '13.면세', flow: 'sale', group: 'saletax' },
  14: { label: '14.건별', flow: 'sale', group: 'saletax' },
  16: { label: '16.수출', flow: 'sale', group: 'saletax' },
  17: { label: '17.카과', flow: 'sale', group: 'salecard' },
  18: { label: '18.카면', flow: 'sale', group: 'salecard' },
  19: { label: '19.카영', flow: 'sale', group: 'salecard' },
  22: { label: '22.현과', flow: 'sale', group: 'salecash' },
  23: { label: '23.현면', flow: 'sale', group: 'salecash' },
  24: { label: '24.현영', flow: 'sale', group: 'salecash' },
  51: { label: '51.과세', flow: 'purchase', group: 'purchasetax' },
  52: { label: '52.영세', flow: 'purchase', group: 'purchasetax' },
  53: { label: '53.면세', flow: 'purchase', group: 'purchasetax' },
  54: { label: '54.불공', flow: 'purchase', group: 'purchasetax' },
  55: { label: '55.수입', flow: 'purchase', group: 'purchasetax' },
  57: { label: '57.카과', flow: 'purchase', group: 'purchasecard' },
  58: { label: '58.카면', flow: 'purchase', group: 'purchasecard' },
  59: { label: '59.카영', flow: 'purchase', group: 'purchasecard' },
  63: { label: '63.카드불공', flow: 'purchase', group: 'purchasecard' },
  61: { label: '61.현과', flow: 'purchase', group: 'purchasecash' },
  62: { label: '62.현면', flow: 'purchase', group: 'purchasecash' },
  64: { label: '64.현영불공', flow: 'purchase', group: 'purchasecash' },
}
export const flowOf = (code: string): 'sale' | 'purchase' => TYPE_INFO[code]?.flow ?? (Number(code) < 50 ? 'sale' : 'purchase')
export function typeLabel(code: string, types?: VatType[]) {
  const known = TYPE_INFO[code]?.label
  if (known) return known
  const server = types?.find(type => type.code === code)
  return server ? `${code}.${server.name}` : code
}

/* 화면모음 f8 tabCategories — 매출 13 + 매입 13. empty 는 아직 자료 경로가 없는 탭 */
export interface TabDef { key: string; flow: 'sale' | 'purchase'; label: string; empty?: boolean; type?: string; group?: string; collect?: Collect }
export const TAB_DEFS: TabDef[] = [
  { key: 'sale-all', flow: 'sale', label: '전체매출' },
  { key: 'sale-11', flow: 'sale', label: '과세', type: '11' },
  { key: 'sale-13', flow: 'sale', label: '면세', type: '13' },
  { key: 'sale-12', flow: 'sale', label: '영세', type: '12' },
  { key: 'sale-14', flow: 'sale', label: '건별', type: '14' },
  { key: 'sale-16', flow: 'sale', label: '수출', type: '16' },
  { key: 'sale-card', flow: 'sale', label: '카드', group: 'salecard' },
  { key: 'sale-cash', flow: 'sale', label: '현금영수증', group: 'salecash' },
  { key: 'sale-n', flow: 'sale', label: '비전자 매출', collect: 'n' },
  { key: 'sale-paper', flow: 'sale', label: '종이과세/면세,현금매출,소형결제대행', empty: true },
  { key: 'sale-carddup', flow: 'sale', label: '카드중복분', empty: true },
  { key: 'sale-deemed', flow: 'sale', label: '간주공급', empty: true },
  { key: 'sale-m', flow: 'sale', label: '수동입력매출', collect: 'm' },
  { key: 'purchase-all', flow: 'purchase', label: '전체매입' },
  { key: 'purchase-51', flow: 'purchase', label: '과세', type: '51' },
  { key: 'purchase-53', flow: 'purchase', label: '면세', type: '53' },
  { key: 'purchase-52', flow: 'purchase', label: '영세', type: '52' },
  { key: 'purchase-54', flow: 'purchase', label: '불공', type: '54' },
  { key: 'purchase-55', flow: 'purchase', label: '수입', type: '55' },
  { key: 'purchase-card', flow: 'purchase', label: '카드', group: 'purchasecard' },
  { key: 'purchase-cash', flow: 'purchase', label: '현금영수증', group: 'purchasecash' },
  { key: 'purchase-n', flow: 'purchase', label: '비전자 매입', collect: 'n' },
  { key: 'purchase-paper', flow: 'purchase', label: '종이과세/면세,비사업용카드,통장송금경비', empty: true },
  { key: 'purchase-carddup', flow: 'purchase', label: '카드중복분', empty: true },
  { key: 'purchase-etc', flow: 'purchase', label: '기타매입', empty: true },
  { key: 'purchase-m', flow: 'purchase', label: '수동입력매입', collect: 'm' },
]
export function tabMatches(tab: TabDef, row: Pick<SalesRecord, 'type' | 'electronic'>) {
  if (tab.empty || flowOf(row.type) !== tab.flow) return false
  if (tab.type) return row.type === tab.type
  if (tab.group) return TYPE_INFO[row.type]?.group === tab.group
  if (tab.collect) return collectOf(row) === tab.collect
  return true
}

/*
 * 분개유형 — 화면 번호는 설계 f8 순서(1현금 2외상 3혼합 4카드 5분개없음).
 * 서버 journalType 값은 0분개없음 1현금 2외상 3혼합 4카드 5추가 상대계정이라 번호를 옮겨 적는다.
 */
export const BUNGE_LABEL: Record<string, string> = { 0: '5.분개없음', 1: '1.현금', 2: '2.외상', 3: '3.혼합', 4: '4.카드', 5: '추가계정' }
export const SCREEN_TO_JOURNAL: Record<string, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '0' }
/** 분개 칸을 비워 두면 유형 그룹이 정한다: 카드 → 카드, 현금영수증 → 현금, 그 밖 → 외상 */
export function defaultJournalType(code: string) {
  const group = TYPE_INFO[code]?.group ?? ''
  return group.includes('card') ? '4' : group.includes('cash') ? '1' : '2'
}
export const paymentOf = (journalType: string) => (journalType === '1' ? '현금' : journalType === '4' ? '카드' : '외상')

/* 휴일 — 공휴일 > 일요일 > 토요일. 2026년분은 씨드, 실제로는 공휴일 API 로 바꾼다 */
export const HOLIDAYS: Record<string, Record<string, string>> = {
  2026: {
    '01-01': '신정', '02-16': '설날 연휴', '02-17': '설날', '02-18': '설날 연휴', '03-01': '삼일절', '03-02': '삼일절 대체공휴일',
    '05-05': '어린이날', '05-24': '부처님오신날', '05-25': '부처님오신날 대체공휴일', '06-03': '지방선거', '06-06': '현충일',
    '08-15': '광복절', '08-17': '광복절 대체공휴일', '09-24': '추석 연휴', '09-25': '추석', '09-26': '추석 연휴',
    '10-03': '개천절', '10-05': '개천절 대체공휴일', '10-09': '한글날', '12-25': '성탄절',
  },
}
export type DayKind = 'holiday' | 'sun' | 'sat' | ''
export function dayKind(date: string): DayKind {
  const digits = date.replace(/\D/g, '')
  if (digits.length < 8) return ''
  const year = digits.slice(0, 4), monthDay = `${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  if (HOLIDAYS[year]?.[monthDay]) return 'holiday'
  const weekday = new Date(`${year}-${monthDay}T00:00:00`).getDay()
  return weekday === 0 ? 'sun' : weekday === 6 ? 'sat' : ''
}
export function dayTitle(date: string) {
  const digits = date.replace(/\D/g, '')
  const name = HOLIDAYS[digits.slice(0, 4)]?.[`${digits.slice(4, 6)}-${digits.slice(6, 8)}`]
  if (name) return name
  const kind = dayKind(date)
  return kind === 'sun' ? '일요일' : kind === 'sat' ? '토요일' : ''
}

/** 과세 유형인데 세액이 0원이면 확인요망(설계 zeroVatTaxWarning) */
export function zeroVatWarning(row: Pick<SalesRecord, 'type' | 'vat'>, types?: VatType[]) {
  const category = types?.find(type => type.code === row.type)?.taxCategory ?? (['11', '51'].includes(row.type) ? 'taxable' : '')
  return category === 'taxable' && /^0+$/.test(row.vat || '0')
}

/* 헤더 클릭 정렬 — 숫자 칸은 크기로, 나머지는 가나다순. 같으면 원래 순서 */
export type SortKey = 'date' | 'type' | 'item' | 'quantity' | 'unitPrice' | 'supply' | 'vat' | 'total' | 'partnerCode' | 'partner' | 'bizNo' | 'collect' | 'journal'
export const NUMERIC_KEYS: SortKey[] = ['quantity', 'unitPrice', 'supply', 'vat', 'total']
export function sortRows<T>(rows: T[], value: (row: T) => string, numeric: boolean, dir: 1 | -1) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const x = value(a.row), y = value(b.row)
      const diff = numeric ? Math.sign((Number(x) || 0) - (Number(y) || 0)) : x.localeCompare(y, 'ko')
      return diff * dir || a.index - b.index
    })
    .map(item => item.row)
}

/* 조회기간 칸 — YYYY-MM-DD 를 년 · 월 · 일 세 칸으로 나눠 쓴다 */
export function splitDate(date: string) {
  const [year = '', month = '', day = ''] = date.split('-')
  return { year, month, day }
}
export function joinDate(year: string, month: string, day: string) {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) return ''
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? '' : value
}
export function lastDay(year: string, month: string) {
  return new Date(Number(year), Number(month), 0).getDate()
}

/* 그리드 분개 칸은 이름만 쓴다(화면모음 f8). 입력은 번호 1~5 */
export const BUNGE_NAME: Record<string, string> = { 0: '분개없음', 1: '현금', 2: '외상', 3: '혼합', 4: '카드', 5: '추가계정' }

/* 불공 계열 유형을 고르면 불공제사유 팝업(실화면 12종) — 화면모음 f8 nonDeductReason */
export const NONDEDUCT_TYPES = ['54', '63', '64']
export const NONDEDUCT_REASONS = [
  { code: '0', name: '토지의 자본적 지출관련' },
  { code: '1', name: '필요적 기재사항 누락' },
  { code: '2', name: '사업과 관련 없는 지출' },
  { code: '3', name: '비영업용 승용차(개별소비세법 §1②3호)구입, 유지, 임차 관련 매입' },
  { code: '4', name: '면세사업과 관련된 분' },
  { code: '5', name: '공통매입세액 안분계산서 분' },
  { code: '6', name: '등록전 매입세액' },
  { code: '7', name: '대손처분 받은 세액' },
  { code: '8', name: '납부(환급)세액 재계산 분' },
  { code: '9', name: '접대비 관련 매입세액' },
  { code: 'A', name: '금거래계좌 미사용 매입세액' },
  { code: 'B', name: '금구리 스크랩 거래계좌 미사용 매입세액' },
]
export const reasonText = (code: string) => {
  const found = NONDEDUCT_REASONS.find(reason => reason.code === code)
  return found ? `${found.code}.${found.name}` : code
}

/* 전표정보의 「출처」 — 화면모음 f8 voucherSource 순서 그대로 */
export function voucherSource(row: Pick<SalesRecord, 'type' | 'item' | 'electronic' | 'journalType'>) {
  const group = TYPE_INFO[row.type]?.group ?? ''
  const collect = collectOf(row)
  if (group.endsWith('card')) return '카드'
  if (group.endsWith('cash')) return '현금영수증'
  if (row.item.includes('통장') || (collect === 'm' && row.journalType === '1')) return '통장'
  if (collect === 'n') return '비전자증빙'
  if (group.endsWith('tax')) return '세금계산서'
  return collect === 'm' ? '수기입력' : '전자자료'
}

/*
 * 전기/차기 — 전전기(2년 전)까지, 현재연도보다 미래는 불가.
 * 라벨은 같은 방향 연속 클릭 횟수로 정한다(전기 → 전전기, 차기 → 차차기).
 */
export function fiscalNavLabel(dir: 'prev' | 'next' | '', count: number) {
  if (dir === 'prev') return count >= 2 ? '전전기' : '전기'
  if (dir === 'next') return count >= 2 ? '차차기' : '차기'
  return ''
}

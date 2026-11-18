// 자료수집 현황 — 화면 계산만 담은 순수 함수 (Nuxt 없이 테스트한다).
import {
  COLLECTION_KINDS, SUMMARY_LINES, type CellStatus, type CollectedRow, type CollectionCompany, type CollectionRun,
  type CollectionHistoryItem, type CollectionRunItem, type RunItemStatus, type SummaryLine,
} from './types.ts'

export interface RunCounts { running: number, waiting: number, done: number, skipped: number, failed: number, cancelled: number, total: number }

export function runCounts(run: CollectionRun | null): RunCounts {
  const counts: RunCounts = { running: 0, waiting: 0, done: 0, skipped: 0, failed: 0, cancelled: 0, total: 0 }
  for (const item of run?.items ?? []) {
    counts[item.status] += 1
    counts.total += 1
  }
  return counts
}

/** 끝난 비율(0~1) — 완료·건너뜀·실패·중단을 모두 끝난 것으로 센다 */
export function runProgress(run: CollectionRun | null) {
  const counts = runCounts(run)
  return counts.total ? (counts.done + counts.skipped + counts.failed + counts.cancelled) / counts.total : 0
}

export const runFinished = (run: CollectionRun | null) =>
  !!run && run.items.every(item => item.status !== 'waiting' && item.status !== 'running')

/** 중단할 수 있는가 — 아직 시작하지 않은 작업이 남았을 때 */
export const canCancel = (run: CollectionRun | null) => !!run && run.items.some(item => item.status === 'waiting')

/** 진행 목록을 회사별로 — 실패가 있는 회사를 위로 */
export function groupRunItems(run: CollectionRun | null) {
  const groups = new Map<string, { clientId: string, clientName: string, items: CollectionRunItem[] }>()
  for (const item of run?.items ?? []) {
    const group = groups.get(item.clientId) ?? { clientId: item.clientId, clientName: item.clientName, items: [] }
    group.items.push(item)
    groups.set(item.clientId, group)
  }
  const failed = (group: { items: CollectionRunItem[] }) => group.items.some(item => item.status === 'failed')
  return [...groups.values()].sort((a, b) => Number(failed(b)) - Number(failed(a)))
}

/** 진행 중인 작업을 표 칸에 겹쳐 보인다 — 끝난 칸은 서버가 준 값을 그대로 쓴다 */
export function overlayRun(companies: CollectionCompany[], run: CollectionRun | null): CollectionCompany[] {
  if (!run) { return companies }
  const live = new Map<string, RunItemStatus>()
  for (const item of run.items) {
    if (item.status === 'waiting' || item.status === 'running') { live.set(item.clientId + ':' + item.kind, item.status) }
  }
  if (!live.size) { return companies }
  return companies.map((company) => {
    const cells = { ...company.cells }
    for (const kind of COLLECTION_KINDS) {
      const status = live.get(company.clientId + ':' + kind.type)
      if (status) { cells[kind.type] = { ...(cells[kind.type] ?? { kind: kind.type, collectedAt: null, count: null }), status } }
    }
    return { ...company, cells }
  })
}

export function filterCompanies(companies: CollectionCompany[], query: string, manager: string) {
  const words = query.trim().toLowerCase().replace(/-/g, '')
  return companies.filter((company) => {
    if (manager && company.manager !== manager) { return false }
    if (!words) { return true }
    return [company.name, company.bizNo.replace(/-/g, ''), company.ceo].some(value => value.toLowerCase().includes(words))
  })
}

/** 표 위 요약 — 완료 · 실패 칸 수와 한 번도 수집하지 않은 회사 */
export function statusSummary(companies: CollectionCompany[]) {
  let done = 0
  let failed = 0
  let never = 0
  for (const company of companies) {
    const cells = Object.values(company.cells)
    done += cells.filter(cell => cell.status === 'done').length
    failed += cells.filter(cell => cell.status === 'failed').length
    if (!cells.some(cell => cell.collectedAt)) { never += 1 }
  }
  return { companies: companies.length, done, failed, never }
}

/** 회사의 마지막 수집일 — 칸 중 가장 늦은 날 */
export function lastCollectedAt(company: CollectionCompany) {
  return Object.values(company.cells).map(cell => cell.collectedAt ?? '').sort().at(-1) || null
}

/** 자동 재시도 금지 — 홈택스는 5회 실패면 계정을 잠그고, 해제는 고객이 직접 해야 한다 */
export const FATAL_CODES = new Set(['BAD_CREDENTIALS', 'ACCOUNT_LOCKED'])

/** 사람이 누르는 재시도는 허용하되 잠긴 계정은 막는다 */
export const canRetry = (item: CollectionRunItem) => item.status === 'failed' && item.code !== 'ACCOUNT_LOCKED'

const pad = (value: number) => String(value).padStart(2, '0')
export const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** 기본 조회기간 — 올해 1월 1일부터 오늘까지 (신고기간 판단은 하지 않는다) */
export function defaultPeriod(today: Date) {
  return { from: isoDay(new Date(today.getFullYear(), 0, 1)), to: isoDay(today) }
}

/** 신용카드 매출처럼 월합계(YYYY-MM)로 오는 자료는 월 단위로 비교한다 */
export function inPeriod(date: string, from: string, to: string) {
  if (date.length === 7) { return date >= from.slice(0, 7) && date <= to.slice(0, 7) }
  return date >= from && date <= to
}

export function validPeriod(from: string, to: string) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/
  return pattern.test(from) && pattern.test(to) && from <= to
}

export function formatDuration(ms: number | null) {
  if (ms === null) { return '' }
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) { return seconds + '초' }
  return Math.floor(seconds / 60) + '분 ' + (seconds % 60) + '초'
}

export const CELL_TONE: Record<CellStatus, 'success' | 'danger' | 'warning' | 'neutral' | 'primary'> = {
  done: 'success', failed: 'danger', skipped: 'warning', none: 'neutral', waiting: 'neutral', running: 'primary', cancelled: 'neutral',
}

/**
 * 사업체 한 곳의 자료수집 현황 — 받아 온 자료에서 그때그때 센다(따로 저장한 숫자가 아니다).
 * 설계 kpiRow: 매출은 6종 합산, 매입 건수는 통장 포함, 매입 금액은 통장 제외.
 */
export function companySummary(company: CollectionCompany, rows: CollectedRow[]) {
  const lines: SummaryLine[] = SUMMARY_LINES.map((def) => {
    const own = def.type ? rows.filter(row => row.kind === def.type) : []
    const dates = own.map(row => row.date).sort()
    return {
      ...def,
      linked: !!def.type,
      count: own.length,
      supply: own.reduce((sum, row) => sum + row.supply, 0),
      tax: own.reduce((sum, row) => sum + row.tax, 0),
      total: def.isBank ? null : own.reduce((sum, row) => sum + row.total, 0),
      dstart: dates[0] ?? '',
      dend: dates.at(-1) ?? '',
      cell: def.type ? company.cells[def.via ?? def.type] ?? null : null,
    }
  })
  const sale = lines.filter(line => line.flow === 'sale')
  const purchase = lines.filter(line => line.flow === 'purchase')
  const sum = (list: SummaryLine[], pick: (line: SummaryLine) => number) => list.reduce((total, line) => total + pick(line), 0)
  return {
    sale,
    purchase,
    kpi: {
      saleCount: sum(sale, line => line.count),
      saleTotal: sum(sale, line => line.total ?? 0),
      purchaseCount: sum(purchase, line => line.count),
      purchaseTotal: sum(purchase.filter(line => !line.isBank), line => line.total ?? 0),
    },
  }
}

/**
 * 홈택스 점검시간 — 한국시간 00~06시엔 조회가 503(maintenance)으로 실패한다(api-guide 9.주의사항).
 * 브라우저 시간대와 상관없이 한국시간으로 본다.
 */
export function hometaxMaintenance(now: Date) {
  const kstHour = (now.getUTCHours() + 9) % 24
  return kstHour < 6
}

/** 부가세 과세기간 — 1기 1~6월, 2기 7~12월 (이지북스 「전체 · 1기 · 2기」) */
export function halfPeriod(year: number, half: 0 | 1 | 2) {
  if (half === 1) { return { from: `${year}-01-01`, to: `${year}-06-30` } }
  if (half === 2) { return { from: `${year}-07-01`, to: `${year}-12-31` } }
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/** 종류별 건수 · 금액 — 수집 자료 보기 왼쪽 목록과 표 아래 합계 */
export function categoryTotals(rows: CollectedRow[]) {
  const totals: Record<string, { count: number, supply: number, tax: number, total: number }> = {}
  for (const row of rows) {
    const sum = totals[row.kind] ??= { count: 0, supply: 0, tax: 0, total: 0 }
    sum.count += 1
    sum.supply += row.supply
    sum.tax += row.tax
    sum.total += row.total
  }
  return totals
}

/**
 * 기수집 안내 — 고른 사업체들이 이 종류를 언제까지 받아 두었는지.
 * 이지북스 수집 모달의 「기수집 안내」 칸.
 */
export function collectedNotice(companies: CollectionCompany[], kind: string) {
  const dates = companies.map(company => company.cells[kind]).filter(cell => cell?.status === 'done' && cell.collectedAt).map(cell => cell!.collectedAt!)
  if (!dates.length) { return '' }
  const latest = dates.sort().at(-1)
  return dates.length === companies.length ? `모두 수집 · 최근 ${latest}` : `${companies.length}곳 중 ${dates.length}곳 수집 · 최근 ${latest}`
}

/** 자료수집 이력 거르기 — 이지북스 「전체 항목」 선택 */
export const filterHistory = (items: CollectionHistoryItem[], kind: string) => kind ? items.filter(item => item.kind === kind) : items

/**
 * 묶음 기수집 안내 — 「매입매출」처럼 여러 종류를 한 줄로 고를 때.
 * 묶음의 종류를 모두 받은 사업체만 수집한 것으로 세고, 날짜는 그중 가장 이른 날(=모두 받은 날)을 쓴다.
 */
export function bundleNotice(companies: CollectionCompany[], kinds: string[]) {
  const dates: string[] = []
  for (const company of companies) {
    const cells = kinds.map(kind => company.cells[kind])
    if (cells.every(cell => cell?.status === 'done' && cell.collectedAt)) { dates.push(cells.map(cell => cell!.collectedAt!).sort()[0]!) }
  }
  if (!dates.length) { return '' }
  const latest = dates.sort().at(-1)
  return dates.length === companies.length ? `모두 수집 · 최근 ${latest}` : `${companies.length}곳 중 ${dates.length}곳 수집 · 최근 ${latest}`
}

/** 이지북스 매입매출 기본 조회기간 — 2년 전 1월 1일부터 오늘까지 */
export function salesPurchasePeriod(today: Date) {
  return { from: `${today.getFullYear() - 2}-01-01`, to: isoDay(today) }
}

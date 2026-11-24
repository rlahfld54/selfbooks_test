// 재무제표 계산 (재무상태표 · 손익계산서 · 합계잔액시산표)
// 금액은 BigInt 로 계산한다 (부동소수점 사용 안 함)

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

export type Amount = bigint | null

export interface SheetRow {
  key: string
  label: string
  // big 대분류 · sub 구간 합계 · mid 중분류 · acct 계정 · total 총계 · note 참고
  kind: 'big' | 'sub' | 'mid' | 'acct' | 'total' | 'note'
  values: Amount[]
  indent?: number
  warn?: boolean
}

// 1. 계정 성격
const BIG: Record<string, string> = { '1': '자산', '2': '부채', '3': '자본', '4': '수익', '5': '비용' }
export const bigOf = (row: LedgerBalanceRow) => BIG[row.category] ?? '기타'

// 차감계정 (대손충당금 · 감가상각누계액 · 매출할인 …)
export const isContra = (row: LedgerBalanceRow) => row.nature.endsWith('차감')

// 차변 잔액이 정상인 계정인가 (자산 · 비용, 차감계정은 반대)
export function isDebitNature(row: LedgerBalanceRow) {
  const big = bigOf(row)
  const debitSide = big === '자산' || big === '비용'
  return isContra(row) ? !debitSide : debitSide
}

const num = (value: string) => (/^-?\d+(\.0+)?$/.test(value) ? BigInt(value.split('.')[0]!) : 0n)

export function sums(row: LedgerBalanceRow) {
  return {
    openDr: num(row.openDebit),
    openCr: num(row.openCredit),
    dr: num(row.debit),
    cr: num(row.credit),
  }
}

// 손익 계정 범위 (400 ~ 999)
export const isPlCode = (code: number) => code >= 401 && code <= 999
const isRevenueCode = (code: number) => (code >= 401 && code <= 430) || (code >= 901 && code <= 950)

// 손익 금액: 수익은 대변 − 차변, 비용은 차변 − 대변 (차감계정은 음수로 나온다)
export function plAmount(row: LedgerBalanceRow, part: 'open' | 'period') {
  const s = sums(row)
  const dr = part === 'open' ? s.openDr : s.dr
  const cr = part === 'open' ? s.openCr : s.cr
  return isRevenueCode(row.code) ? cr - dr : dr - cr
}

// 당기순이익 (part: open = 조회 시작일 이전 누적, period = 조회 기간)
export function netIncome(rows: LedgerBalanceRow[], part: 'open' | 'period') {
  return rows.filter(row => isPlCode(row.code)).reduce((total, row) => {
    const amount = plAmount(row, part)
    return isRevenueCode(row.code) ? total + amount : total - amount
  }, 0n)
}

// 금액 표시 (음수는 -)
export function formatAmount(value: Amount) {
  if (value === null) return ''
  const negative = value < 0n
  const text = (negative ? -value : value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return negative ? `-${text}` : text
}

const add = (a: Amount, b: Amount): Amount => (a === null && b === null ? null : (a ?? 0n) + (b ?? 0n))

// 2. 재무상태표
const BS_LAYOUT = [
  { big: '자산', sections: [
    { title: 'Ⅰ.유동자산', mids: ['당좌자산', '재고자산'] },
    { title: 'Ⅱ.비유동자산', mids: ['투자자산', '유형자산', '무형자산', '기타비유동자산'] },
  ] },
  { big: '부채', sections: [
    { title: 'Ⅰ.유동부채', mids: ['유동부채'] },
    { title: 'Ⅱ.비유동부채', mids: ['비유동부채'] },
  ] },
  { big: '자본', sections: [
    { title: 'Ⅰ.자본금', mids: ['자본금'] },
    { title: 'Ⅱ.자본잉여금', mids: ['자본잉여금'] },
    { title: 'Ⅲ.자본조정', mids: ['자본조정'] },
    { title: 'Ⅳ.기타포괄손익누계액', mids: ['기타포괄손익누계액'] },
    { title: 'Ⅴ.이익잉여금', mids: ['이익잉여금'] },
  ] },
]
const MID_NO = ['①', '②', '③', '④', '⑤']
// 미처분이익잉여금 — 마감하지 않은 손익은 여기에 더해야 대차가 맞는다
export const UNAPPROPRIATED_CODE = 377

// 기준일 잔액 (정상 쪽 기준, 차감계정은 음수)
function bsAmount(row: LedgerBalanceRow) {
  const s = sums(row)
  const dr = s.openDr + s.dr
  const cr = s.openCr + s.cr
  const own = isDebitNature(row) ? dr - cr : cr - dr
  return isContra(row) ? -own : own
}

export function balanceSheet(current: LedgerBalanceRow[], prior: LedgerBalanceRow[] | null, hideZero = false) {
  const rows: SheetRow[] = []
  // 마감하지 않은 손익 = 조회 시작일 이전 손익 + 당기 손익
  const earnings = (list: LedgerBalanceRow[]) => netIncome(list, 'open') + netIncome(list, 'period')
  const curEarnings = earnings(current)
  const priorEarnings = prior ? earnings(prior) : null
  const totals: Record<string, [bigint, bigint]> = {}

  for (const block of BS_LAYOUT) {
    let bigNow = 0n
    let bigPrev = 0n
    const blockRows: SheetRow[] = []
    for (const section of block.sections) {
      let secNow = 0n
      let secPrev = 0n
      const secRows: SheetRow[] = []
      section.mids.forEach((mid, index) => {
        const codes = new Set<number>()
        for (const row of current) if (bigOf(row) === block.big && row.middle === mid) codes.add(row.code)
        for (const row of prior ?? []) if (bigOf(row) === block.big && row.middle === mid) codes.add(row.code)
        if (mid === '이익잉여금') codes.add(UNAPPROPRIATED_CODE)

        const lines = [...codes].sort((a, b) => a - b).map((code) => {
          const cur = current.find(row => row.code === code)
          const pre = prior?.find(row => row.code === code)
          let now = cur ? bsAmount(cur) : 0n
          let before: bigint | null = prior ? (pre ? bsAmount(pre) : 0n) : null
          if (code === UNAPPROPRIATED_CODE) {
            now += curEarnings
            if (before !== null && priorEarnings !== null) before += priorEarnings
          }
          return { code, name: cur?.name ?? pre?.name ?? '미처분이익잉여금', now, before }
        })

        const midNow = lines.reduce((t, l) => t + l.now, 0n)
        const midPrev = lines.reduce((t, l) => t + (l.before ?? 0n), 0n)
        secNow += midNow
        secPrev += midPrev
        const shown = lines.filter(l => !hideZero || l.now !== 0n || (l.before ?? 0n) !== 0n)
        if (section.mids.length > 1) {
          secRows.push({ key: `m-${mid}`, kind: 'mid', label: `${MID_NO[index]} ${mid}`, indent: 1, values: [null, midNow, null, prior ? midPrev : null] })
        }
        for (const line of shown) {
          secRows.push({ key: `a-${line.code}`, kind: 'acct', label: line.name, indent: 2, values: [null, line.now, null, line.before] })
        }
      })
      bigNow += secNow
      bigPrev += secPrev
      blockRows.push({ key: `s-${section.title}`, kind: 'sub', label: section.title, indent: 1, values: [null, secNow, null, prior ? secPrev : null] }, ...secRows)
    }
    totals[block.big] = [bigNow, bigPrev]
    rows.push({ key: `b-${block.big}`, kind: 'big', label: block.big, values: [null, null, null, null] }, ...blockRows)
    if (block.big === '자본') {
      rows.push(
        { key: 'ni-cur', kind: 'note', label: '(당기순이익) 당기', values: [null, netIncome(current, 'period'), null, prior ? netIncome(prior, 'period') : null] },
      )
    }
    rows.push({ key: `t-${block.big}`, kind: 'total', label: `${block.big}총계`, values: [null, bigNow, null, prior ? bigPrev : null] })
  }

  const assets = totals['자산'] ?? [0n, 0n]
  const debt = totals['부채'] ?? [0n, 0n]
  const equity = totals['자본'] ?? [0n, 0n]
  const le: [bigint, bigint] = [debt[0] + equity[0], debt[1] + equity[1]]
  const diff = assets[0] - le[0]
  const ok = diff === 0n && (!prior || assets[1] === le[1])
  rows.push({ key: 't-le', kind: 'total', label: '부채와자본총계', warn: !ok, values: [null, le[0], null, prior ? le[1] : null] })
  return { rows, diff, balanced: ok }
}

// 3. 손익계산서
const IS_SECTIONS = [
  { key: 'rev', title: 'Ⅰ.매출액', from: 401, to: 430 },
  { key: 'cogs', title: 'Ⅱ.매출원가', from: 451, to: 800 },
  { key: 'sga', title: 'Ⅳ.판매비와관리비', from: 801, to: 900 },
  { key: 'nonrev', title: 'Ⅵ.영업외수익', from: 901, to: 950 },
  { key: 'nonexp', title: 'Ⅶ.영업외비용', from: 951, to: 997 },
  { key: 'tax', title: 'Ⅸ.소득세등', from: 998, to: 999 },
] as const

// 상품 계정 — 상품매출원가 = 기초상품재고액 + 당기상품매입액 − 기말상품재고액
export const GOODS_CODE = 146

export function incomeStatement(current: LedgerBalanceRow[], prior: LedgerBalanceRow[] | null, corporate: boolean) {
  const rows: SheetRow[] = []
  const sum: Record<string, [bigint, bigint | null]> = {}
  const period = (list: LedgerBalanceRow[], from: number, to: number) => list
    .filter(row => row.code >= from && row.code <= to)
    .map(row => ({ code: row.code, name: row.name, amount: plAmount(row, 'period') }))
    .filter(line => line.amount !== 0n)

  const push = (section: typeof IS_SECTIONS[number]) => {
    const cur = period(current, section.from, section.to)
    const pre = prior ? period(prior, section.from, section.to) : []
    const curTotal = cur.reduce((t, l) => t + l.amount, 0n)
    const preTotal = prior ? pre.reduce((t, l) => t + l.amount, 0n) : null
    sum[section.key] = [curTotal, preTotal]
    const title = section.key === 'tax' ? (corporate ? 'Ⅸ.법인세등' : 'Ⅸ.소득세등') : section.title
    rows.push({ key: `s-${section.key}`, kind: 'sub', label: title, values: [null, curTotal, null, preTotal] })
    const codes = [...new Set([...cur, ...pre].map(l => l.code))].sort((a, b) => a - b)
    for (const code of codes) {
      const a = cur.find(l => l.code === code)
      const b = pre.find(l => l.code === code)
      rows.push({ key: `a-${section.key}-${code}`, kind: 'acct', label: (a ?? b)!.name, indent: 1, values: [a?.amount ?? null, null, b?.amount ?? null, null] })
    }
    if (section.key === 'cogs') pushGoods()
  }

  // 상품매출원가 내역 (상품 계정이 움직였을 때만)
  const pushGoods = () => {
    const goods = (list: LedgerBalanceRow[] | null) => {
      const row = list?.find(r => r.code === GOODS_CODE)
      if (!row) return null
      const s = sums(row)
      const opening = s.openDr - s.openCr
      return { opening, purchase: s.dr, closing: opening + s.dr - s.cr }
    }
    const cur = goods(current)
    const pre = goods(prior)
    const moved = (g: ReturnType<typeof goods>) => !!g && (g.opening !== 0n || g.purchase !== 0n || g.closing !== 0n)
    if (!moved(cur) && !moved(pre)) return
    rows.push({ key: 'g-head', kind: 'mid', label: '상품매출원가', indent: 1, values: [null, null, null, null] })
    rows.push({ key: 'g-open', kind: 'acct', label: '기초상품재고액', indent: 2, values: [cur?.opening ?? null, null, pre?.opening ?? null, null] })
    rows.push({ key: 'g-buy', kind: 'acct', label: '당기상품매입액', indent: 2, values: [cur?.purchase ?? null, null, pre?.purchase ?? null, null] })
    rows.push({ key: 'g-close', kind: 'acct', label: '기말상품재고액', indent: 2, values: [cur?.closing ?? null, null, pre?.closing ?? null, null] })
  }

  const v = (key: string, i: 0 | 1) => sum[key]?.[i] ?? 0n
  const both = (a: [bigint, bigint | null]): Amount[] => [null, a[0], null, prior ? a[1] : null]
  const profit = (key: string, title: string, value: [bigint, bigint | null]) => {
    const loss = value[0] < 0n
    rows.push({ key, kind: 'sub', label: loss ? title.replace('이익', '손실') : title, values: both(value) })
  }

  push(IS_SECTIONS[0])
  push(IS_SECTIONS[1])
  const gross: [bigint, bigint | null] = [v('rev', 0) - v('cogs', 0), prior ? v('rev', 1) - v('cogs', 1) : null]
  profit('gp', 'Ⅲ.매출총이익', gross)
  push(IS_SECTIONS[2])
  const operating: [bigint, bigint | null] = [gross[0] - v('sga', 0), prior ? (gross[1] ?? 0n) - v('sga', 1) : null]
  profit('op', 'Ⅴ.영업이익', operating)
  push(IS_SECTIONS[3])
  push(IS_SECTIONS[4])
  const beforeTax: [bigint, bigint | null] = [
    operating[0] + v('nonrev', 0) - v('nonexp', 0),
    prior ? (operating[1] ?? 0n) + v('nonrev', 1) - v('nonexp', 1) : null,
  ]
  profit('pre', corporate ? 'Ⅷ.법인세차감전이익' : 'Ⅷ.소득세차감전이익', beforeTax)
  push(IS_SECTIONS[5])
  const net: [bigint, bigint | null] = [beforeTax[0] - v('tax', 0), prior ? (beforeTax[1] ?? 0n) - v('tax', 1) : null]
  profit('ni', 'Ⅹ.당기순이익', net)
  return { rows, netIncome: net[0] }
}

// 4. 합계잔액시산표 — 차변 잔액 · 차변 합계 | 계정과목 | 대변 합계 · 대변 잔액
const BIG_ORDER = ['자산', '부채', '자본', '수익', '비용', '기타']
const CURRENT_ASSET = ['당좌자산', '재고자산']

export function trialBalance(current: LedgerBalanceRow[]) {
  // 손익 계정은 당기 발생만, 그 이전 손익은 미처분이익잉여금으로 넘긴다
  const carried = netIncome(current, 'open')
  const cols = (row: LedgerBalanceRow): Amount[] => {
    const s = sums(row)
    let dr = s.dr
    let cr = s.cr
    if (!isPlCode(row.code)) {
      dr += s.openDr
      cr += s.openCr
    }
    if (row.code === UNAPPROPRIATED_CODE && carried > 0n) cr += carried
    if (row.code === UNAPPROPRIATED_CODE && carried < 0n) dr -= carried
    return isDebitNature(row) ? [dr - cr, dr || null, cr || null, null] : [null, dr || null, cr || null, cr - dr]
  }
  const sumOf = (list: LedgerBalanceRow[]) => list.reduce<Amount[]>((t, row) => cols(row).map((v, i) => add(t[i] ?? null, v)), [null, null, null, null])
  const active = current.filter((row) => {
    const c = cols(row)
    return c[1] !== null || c[2] !== null
  })
  const order = (big: string) => BIG_ORDER.indexOf(big)
  active.sort((a, b) => order(bigOf(a)) - order(bigOf(b)) || a.code - b.code)
  const headOf = (row: LedgerBalanceRow) => (bigOf(row) === '자산'
    ? (CURRENT_ASSET.includes(row.middle) ? '유동자산' : '비유동자산')
    : (row.middle || bigOf(row)))

  const rows: SheetRow[] = []
  let total: Amount[] = [null, null, null, null]
  for (const head of [...new Set(active.map(headOf))]) {
    const inHead = active.filter(row => headOf(row) === head)
    const headSum = sumOf(inHead)
    total = total.map((v, i) => add(v, headSum[i] ?? null))
    rows.push({ key: `b-${head}`, kind: 'big', label: head, values: headSum })
    const asset = bigOf(inHead[0]!) === '자산'
    const mids = asset ? [...new Set(inHead.map(row => row.middle || '기타'))] : [null]
    for (const mid of mids) {
      const inMid = mid === null ? inHead : inHead.filter(row => (row.middle || '기타') === mid)
      if (mid !== null) rows.push({ key: `m-${head}-${mid}`, kind: 'mid', label: `<${mid}>`, indent: 1, values: sumOf(inMid) })
      for (const row of inMid) rows.push({ key: `a-${row.code}`, kind: 'acct', label: row.name, indent: 2, values: cols(row) })
    }
  }
  const [debitBalance, debitSum, creditSum, creditBalance] = total.map(v => v ?? 0n)
  const ok = debitSum === creditSum && debitBalance === creditBalance
  if (active.length) rows.push({ key: 'total', kind: 'total', label: '합계', warn: !ok, values: total })
  return { rows, balanced: active.length ? ok : null }
}

// 5. 기간
export function monthEnd(year: number, month: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

export function periodLabel(from: string, to: string) {
  const text = (date: string) => {
    const [y, m, d] = date.split('-')
    return `${y}년${Number(m)}월${Number(d)}일`
  }
  return `${text(from)} ~ ${text(to)}`
}

export type Side = 'DEBIT' | 'CREDIT'
export interface MockAccount {
  id: number
  sourceId?: string
  isLocked?: boolean
  fxMethodCode?: string
  code: string
  name: string
  displayName: string
  category: string
  subcategory: string
  balanceSide: Side
  isActive: boolean
  englishName?: string
  statementCode?: string
  attribute?: string
  relatedAccount?: string
  foreignCurrency?: boolean
  businessCar?: boolean
}
export interface MockSummary {
  kind?: string
  canExclude?: boolean
  excluded?: boolean
  note?: string
  isNew?: boolean
  id: number
  sourceId?: string
  typeCode?: string
  transactionElementCode?: number | null
  accountId: number
  code: string
  name: string
  side: Side | 'UNKNOWN'
  isFixed: boolean
  isActive: boolean
}
export function summarySide(element: number | null | undefined, name = ''): MockSummary['side'] {
  if (element != null && Number.isInteger(element) && element >= 1 && element <= 8)
    return element <= 4 ? 'DEBIT' : 'CREDIT'
  if (name.includes('차변')) return 'DEBIT'
  if (name.includes('대변')) return 'CREDIT'
  return 'UNKNOWN'
}
export const summaryKind = (row: MockSummary) =>
  row.kind ||
  ({ FIXED: '고정적요', VARIABLE: '변동적요', VAT: '부가세적요' }[row.typeCode ?? ''] ??
    (row.isFixed ? '고정적요' : row.typeCode || '변동적요'))
export const categories: Record<string, string[]> = {
  자산: ['당좌자산', '재고자산', '투자자산', '유형자산', '무형자산', '기타비유동자산'],
  부채: ['유동부채', '비유동부채'],
  자본: ['자본금', '자본잉여금', '이익잉여금', '자본조정', '기타포괄손익누계액'],
  수익: ['매출', '영업외수익'],
  비용: [
    '매출원가',
    '제조원가',
    '도급원가',
    '보관원가',
    '분양원가',
    '운송원가',
    '판매비및일반관리비',
    '영업외비용',
    '법인(소득)세등',
  ],
}
export const sideLabel = (side: Side | 'UNKNOWN') =>
  side === 'UNKNOWN' ? '미확정' : side === 'DEBIT' ? '차변' : '대변'

export function accountCategories(accounts: MockAccount[]): Record<string, string[]> {
  const result = Object.fromEntries(
    Object.entries(categories).map(([key, values]) => [key, [...values]]),
  )
  for (const account of accounts) {
    const children = result[account.category] ?? (result[account.category] = [])
    if (account.subcategory && !children.includes(account.subcategory))
      children.push(account.subcategory)
  }
  return result
}

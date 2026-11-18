export type Side = 'DEBIT' | 'CREDIT'
export interface MockAccount {
  id: number; sourceId?: string; isLocked?: boolean; fxMethodCode?: string; code: string; name: string; displayName: string
  category: string; subcategory: string; balanceSide: Side; isActive: boolean
  englishName?: string; statementCode?: string; attribute?: string
  relatedAccount?: string; foreignCurrency?: boolean; businessCar?: boolean
}
export interface MockSummary {
  id: number; sourceId?: string; typeCode?: string; transactionElementCode?: number | null; accountId: number; code: string; name: string
  side: Side | 'UNKNOWN'; isFixed: boolean; isActive: boolean
}
export const categories: Record<string, string[]> = {
  자산: ['당좌자산', '재고자산', '투자자산', '유형자산', '무형자산', '기타비유동자산'],
  부채: ['유동부채', '비유동부채'], 자본: [], 수익: [], 비용: [],
}
export const sideLabel = (side: Side | 'UNKNOWN') => side === 'UNKNOWN' ? '미확정' : side === 'DEBIT' ? '차변' : '대변'

export function accountCategories(accounts: MockAccount[]): Record<string, string[]> {
  const result = Object.fromEntries(Object.entries(categories).map(([key, values]) => [key, [...values]]))
  for (const account of accounts) {
    const children = result[account.category] ?? (result[account.category] = [])
    if (account.subcategory && !children.includes(account.subcategory)) children.push(account.subcategory)
  }
  return result
}


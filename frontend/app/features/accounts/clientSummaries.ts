import type { MockAccount, MockSummary } from './types.ts'
export interface ClientSummaryRecord {
  sourceId: string; code: string | null; summaryNo: number; name: string; typeCode: string
  transactionElementCode: number | null; isActive: boolean
  accountSourceId: string; accountDefaultId: string | null; accountCode: string; accountName: string
}
export interface ClientSummaryResponse {
  client: { id: string; name: string }; summaries: ClientSummaryRecord[]
}
export function mapClientSummaries(rows: ClientSummaryRecord[], defaults: MockAccount[]) {
  const accountIds = new Map<string, number>()
  const accounts: MockAccount[] = []
  const summaries: MockSummary[] = rows.map((row, index) => {
    let accountId = accountIds.get(row.accountSourceId)
    if (accountId === undefined) {
      const original = defaults.find(a => row.accountDefaultId !== null && a.sourceId === row.accountDefaultId)
      accountId = original?.id ?? -(accounts.length + 1)
      accountIds.set(row.accountSourceId, accountId)
      accounts.push({
        ...(original ?? { category: '미분류', subcategory: '', balanceSide: 'DEBIT' as const, isActive: true }),
        id: accountId, sourceId: row.accountSourceId, code: row.accountCode, name: row.accountName, displayName: row.accountName,
      })
    }
    return {
      id: index + 1, sourceId: row.sourceId, accountId, code: row.code ?? '',
      name: row.name, side: 'UNKNOWN', isFixed: row.typeCode === 'FIXED',
      typeCode: row.typeCode, transactionElementCode: row.transactionElementCode,
      isActive: row.isActive,
    }
  })
  return { accounts, summaries }
}

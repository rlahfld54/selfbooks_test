export interface JournalLine {
  side: 'debit' | 'credit'
  account: string
  amount: string
  memo: string
}
export interface SalesDraft {
  id: string
  version: number
  date: string
  periodId: string
  partnerId: string
  type: '11' | '51'
  item: string
  supply: string
  vat: string
  payment: string
  memo: string
  zeroVatConfirmed: boolean
  lines: JournalLine[]
}
export interface SalesRecord extends SalesDraft {
  partner: string
  partnerCode: string
  status: 'draft' | 'posted'
  entryNumber: string
  needsReview: boolean
}
export interface SalesMeta {
  company: string
  establishment: string
  user: string
  periods: { id: string; label: string; start: string; end: string; status: string }[]
  accounts: { id: string; code: string; name: string }[]
  partners: { id: string; code: string; name: string }[]
}
export interface SalesFilter {
  from: string
  to: string
  type: string
  query: string
}
export const transactionTypes = [
  { value: '11', label: '11 · 매출 과세' },
  { value: '51', label: '51 · 매입 과세' },
]
export const payments = ['외상', '현금', '예금', '카드', '기타'].map((value) => ({
  value,
  label: value,
}))
export function emptyDraft(): SalesDraft {
  return {
    id: '',
    version: 0,
    date: '',
    periodId: '',
    partnerId: '',
    type: '11',
    item: '',
    supply: '',
    vat: '',
    payment: '외상',
    memo: '',
    zeroVatConfirmed: false,
    lines: [],
  }
}
export function copyDraft(row: SalesDraft): SalesDraft {
  return {
    id: row.id,
    version: row.version,
    date: row.date,
    periodId: row.periodId,
    partnerId: row.partnerId,
    type: row.type,
    item: row.item,
    supply: row.supply,
    vat: row.vat,
    payment: row.payment,
    memo: row.memo,
    zeroVatConfirmed: row.zeroVatConfirmed,
    lines: row.lines.map((line) => ({ ...line })),
  }
}
export function sumAmounts(values: string[]) {
  return values
    .reduce((total, value) => total + (/^\d{1,24}$/.test(value) ? BigInt(value) : 0n), 0n)
    .toString()
}
export function filterRecords(rows: SalesRecord[], filter: SalesFilter) {
  const query = filter.query.trim().toLocaleLowerCase()
  return rows.filter(
    (row) =>
      row.date >= filter.from &&
      row.date <= filter.to &&
      (!filter.type || row.type === filter.type) &&
      `${row.partner} ${row.partnerCode} ${row.item} ${row.memo}`
        .toLocaleLowerCase()
        .includes(query),
  )
}
export type SalesTransport = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: SalesDraft },
) => Promise<{ data: T }>
export function createSalesJournalService(request: SalesTransport) {
  return {
    metadata: () => request<SalesMeta>('/sales-journal/meta'),
    list: () => request<SalesRecord[]>('/sales-journal'),
    save: (draft: SalesDraft) =>
      request<SalesRecord>(
        draft.version ? `/sales-journal/${encodeURIComponent(draft.id)}` : '/sales-journal',
        { method: draft.version ? 'PUT' : 'POST', body: copyDraft(draft) },
      ),
    remove: (row: SalesDraft) =>
      request<{ id: string }>(
        `/sales-journal/${encodeURIComponent(row.id)}?version=${row.version}`,
        { method: 'DELETE' },
      ),
  }
}

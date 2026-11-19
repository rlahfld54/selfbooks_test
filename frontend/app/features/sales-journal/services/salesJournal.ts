import type { ApiRequestOptions } from '../../../services/api-client.ts'

export interface VoucherItem { name: string; quantity: string; unitPrice: string; supply: string; vat: string }
export interface VatType { code: string; name: string; direction: string; taxCategory: string; enabled: boolean }
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
  type: string
  item: string
  supply: string
  vat: string
  payment: string
  memo: string
  electronic?: boolean
  quantity?: string
  unitPrice?: string
  journalType?: string
  cardCompany?: string
  evidenceNumber?: string
  nonDeductionReason?: string
  items?: VoucherItem[]
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
  companyId?: string
  establishmentId?: string
  summaries?: {id:string;accountId:string;text:string}[]
  vatTypes?: VatType[]
  company: string
  establishment: string
  user: string
  periods: { id: string; label: string; start: string; end: string; status: string }[]
  accounts: { id: string; code: string; name: string }[]
  partners: { id: string; code: string; name: string; businessNumber?: string }[]
}
export interface SalesFilter {
  from: string
  to: string
  type: string
  query: string
  payment?: string
}
export const salesCategories = [
  { value: 'all', label: '전체', type: '', payment: '' },
  { value: 'sales', label: '매출 과세', type: '11', payment: '' },
  { value: 'purchases', label: '매입 과세', type: '51', payment: '' },
  { value: 'sales-card', label: '매출카드', type: '11', payment: '카드' },
  { value: 'purchases-card', label: '매입카드', type: '51', payment: '카드' },
  { value: 'sales-cash', label: '매출현금', type: '11', payment: '현금' },
  { value: 'purchases-cash', label: '매입현금', type: '51', payment: '현금' },
]
export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [year, number] = month.split('-').map(Number)
  if (!year || !number) return null
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = number === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(number) ? 30 : 31
  return { from: `${month}-01`, to: `${month}-${days}` }
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
    journalType: '2',
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
    electronic: row.electronic ?? false,
    quantity: row.quantity ?? '1', unitPrice: row.unitPrice ?? '0',
    ...(!!row.journalType ? { journalType: row.journalType } : {}),
    cardCompany: row.cardCompany ?? '', evidenceNumber: row.evidenceNumber ?? '',
    nonDeductionReason: row.nonDeductionReason ?? '', items: (row.items ?? []).map(item => ({ ...item })),
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
      (!filter.payment || row.payment === filter.payment) &&
      `${row.partner} ${row.partnerCode} ${row.item} ${row.memo}`
        .toLocaleLowerCase()
        .includes(query),
  )
}
export type SalesTransport = <T>(
  path: string,
  options?: ApiRequestOptions,
) => Promise<{ data: T }>
export function createSalesJournalService(request: SalesTransport) {
  return {
    createPartner: (input:{name:string;code:string;businessNumber:string}) => request<{id:string;name:string;code:string}>('/sales-journal/partners',{method:'POST',body:input}),
    deleted: () => request<SalesRecord[]>('/sales-journal/deleted'),
    restore: (row: SalesRecord) => request<SalesRecord>(`/sales-journal/${encodeURIComponent(row.id)}/restore`, { method: 'POST', body: { version: row.version } }),
    history: (id: string) => request<{action:string;actor:string;createdAt:string;before:unknown;after:unknown}[]>(`/sales-journal/${encodeURIComponent(id)}/history`),
    batch: (action: 'copy'|'move'|'bulk', selected: SalesRecord[], changes: Record<string,unknown>) => request<SalesRecord[]>(`/sales-journal/${action}`, {method:'POST',body:{selected:selected.map(({id,version})=>({id,version})),changes}}),
    metadata: (signal?: AbortSignal) => request<SalesMeta>('/sales-journal/meta', { signal }),
    list: (signal?: AbortSignal) => request<SalesRecord[]>('/sales-journal', { signal }),
    save: (draft: SalesDraft) =>
      request<SalesRecord>(
        draft.version ? `/sales-journal/${encodeURIComponent(draft.id)}` : '/sales-journal',
        { method: draft.version ? 'PUT' : 'POST', body: copyDraft(draft) },
      ),
    remove: (row: SalesDraft) =>
      request<{ id: string }>(
        `/sales-journal/${encodeURIComponent(row.id)}?version=${row.version}`,
        { method: 'DELETE', body: {} },
      ),
  }
}

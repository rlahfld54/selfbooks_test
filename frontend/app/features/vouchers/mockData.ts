import type { Mode, VoucherRow } from './model'
export const accounts = [{ code: '0101', name: '현금' }, { code: '0108', name: '외상매출금' }, { code: '0251', name: '외상매입금' }, { code: '0401', name: '상품매출' }, { code: '0830', name: '소모품비' }, { code: '0811', name: '복리후생비' }]
export const clients = [
  { code: 'C001', name: '한빛문구', registration: '123-45-00001 (가상)', category: '개인', tax: '일반과세', balance: '320000' },
  { code: 'C002', name: '(주)푸른유통', registration: '234-56-00002 (가상)', category: '법인', tax: '일반과세', balance: '2200000' },
  { code: 'C003', name: '오월식당', registration: '345-67-00003 (가상)', category: '개인', tax: '일반과세', balance: '0' },
]
export const evidenceTypes = ['E01 세금계산서', 'E02 카드전표', 'E03 현금영수증', 'E04 기타 증빙']
export function blankRow(id: string, date = '2026-11-10', number = '00001'): VoucherRow {
  return { id, date, number, kind: '대체', account: '', client: '', memo: '', debit: '0', credit: '0', supply: '0', vat: '0', evidence: evidenceTypes[0]!, attachment: false }
}
export function loadMockRows(mode: Mode): VoucherRow[] {
  return Array.from({ length: mode === 'general' ? 18 : 12 }, (_, index) => {
    const pair = mode === 'general' ? Math.floor(index / 2) : index
    const client = clients[pair % clients.length]!
    return { ...blankRow(`${mode}-${index}`, `2026-11-${String(pair + 1).padStart(2, '0')}`, String(pair + 1).padStart(5, '0')), kind: mode === 'general' ? '대체' : pair % 2 ? '11' : '51', account: index % 2 ? '0101' : '0830', client: client.code, memo: ['사무용품 구입', '상품 납품', '직원 식대'][pair % 3]!, debit: mode === 'general' && index % 2 === 0 ? '100000' : '0', credit: mode === 'general' && index % 2 === 1 ? '100000' : '0', supply: '100000', vat: mode === 'general' || pair === 2 ? '0' : '10000', attachment: pair % 3 !== 2 }
  })
}
export const historyRows = loadMockRows('general').filter((_, i) => i % 2 === 0).map(row => ({ ...row, id: `history-${row.id}`, date: row.date.replace('11', '10') })).reverse()
// Independent fixture entries, not automatic accounting entries or tax calculations.
export const salesJournalExamples = loadMockRows('sales').flatMap((row, index) => {
  const value = index === 2 ? '100000' : '110000'
  return [
    { ...row, id: `${row.id}-debit`, account: row.kind === '11' ? '0101' : '0830', debit: value, credit: '0' },
    { ...row, id: `${row.id}-credit`, account: row.kind === '11' ? '0401' : '0101', debit: '0', credit: value },
  ]
})
// Replace this adapter with API persistence later. No browser storage or network side effects.
export const saveMockRows = (rows: VoucherRow[]) => rows.map(row => ({ ...row }))


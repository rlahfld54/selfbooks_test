export type Mode = 'general' | 'sales'
export interface VoucherRow {
  id: string; date: string; number: string; kind: string; account: string; client: string; memo: string
  debit: string; credit: string; supply: string; vat: string; evidence: string; attachment: boolean
}
export interface Column { key: keyof VoucherRow | 'accountName' | 'clientName' | 'total'; label: string; width: number; amount?: boolean; readonly?: boolean }
export const amount = (value: string) => /^(0|[1-9]\d{0,14})$/.test(value)
export const total = (row: VoucherRow) => (BigInt(row.supply || '0') + BigInt(row.vat || '0')).toString()
export const money = (value: string) => BigInt(value || '0').toLocaleString('ko-KR')
export const sum = (rows: VoucherRow[], key: 'debit' | 'credit') => rows.reduce((n, row) => n + BigInt(row[key]), 0n)
export function group(rows: VoucherRow[], row?: VoucherRow) { return row ? rows.filter(item => item.number === row.number && item.date === row.date) : [] }
export function checks(rows: VoucherRow[], row: VoucherRow, mode: Mode) {
  const lines = group(rows, row)
  return [
    { label: '필수 항목', ok: !!(row.date && row.number && row.memo && (mode === 'sales' || row.account)), key: mode === 'sales' ? 'memo' : 'account' },
    { label: '거래처 선택', ok: !!row.client, key: 'client' },
    { label: '증빙자료 연결', ok: row.attachment, key: 'evidence' },
    ...(mode === 'general' ? [{ label: '차변·대변 일치', ok: sum(lines, 'debit') === sum(lines, 'credit'), key: 'debit' }] : [{ label: '과세 유형 부가세 확인', ok: !['11', '51'].includes(row.kind) || BigInt(row.vat) > 0n, key: 'vat' }]),
    { label: '동일 거래 중복 확인', ok: !rows.some(other => other.id !== row.id && other.number !== row.number && other.date === row.date && other.client === row.client && other.memo === row.memo && other.debit === row.debit && other.credit === row.credit && other.supply === row.supply && other.vat === row.vat), key: 'number' },
  ]
}
export function columns(mode: Mode): Column[] {
  const common: Column[] = [{ key: 'date', label: '일자', width: 128 }, { key: 'number', label: '전표번호', width: 96 }, { key: 'kind', label: '구분', width: 110 }]
  const client: Column[] = [{ key: 'client', label: '거래처코드', width: 100 }, { key: 'clientName', label: '거래처명', width: 170, readonly: true }]
  const memo: Column = { key: 'memo', label: '적요', width: 240 }
  return mode === 'general' ? [...common, { key: 'account', label: '계정코드', width: 95 }, { key: 'accountName', label: '계정과목', width: 150, readonly: true }, ...client, memo, { key: 'debit', label: '차변금액', width: 140, amount: true }, { key: 'credit', label: '대변금액', width: 140, amount: true }] : [...common, { key: 'evidence', label: '증빙유형', width: 160 }, ...client, { key: 'supply', label: '공급가액', width: 140, amount: true }, { key: 'vat', label: '부가세', width: 120, amount: true }, { key: 'total', label: '합계금액', width: 150, amount: true, readonly: true }, memo]
}

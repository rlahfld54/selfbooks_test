import type { JournalLine, SalesDraft, SalesRecord, VatType, VoucherItem } from './salesJournal.ts'
export type Rounding = 'floor' | 'round' | 'ceil'
function divide(n: bigint, d: bigint, rounding: Rounding) {
  return n / d + (rounding === 'ceil' ? (n % d ? 1n : 0n) : rounding === 'round' ? (n % d * 2n >= d ? 1n : 0n) : 0n)
}
function decimal(value: string) {
  if (!/^\d{1,15}(\.\d{1,6})?$/.test(value)) throw new Error('수량·단가는 양수이며 소수점 6자리 이내로 입력하세요.')
  const [whole, fraction = ''] = value.split('.')
  return { n: BigInt(whole! + fraction), d: 10n ** BigInt(fraction.length) }
}
export function supplyFromQuantity(quantity: string, price: string, rounding: Rounding = 'floor') {
  const a = decimal(quantity), b = decimal(price)
  return divide(a.n * b.n, a.d * b.d, rounding).toString()
}
export function calculateVat(supply: string, category: string, rounding: Rounding = 'floor') {
  if (!/^\d{1,15}$/.test(supply)) throw new Error('공급가액은 15자리 이내 정수로 입력하세요.')
  if (category === 'zero' || category === 'exempt') return '0'
  if (category !== 'taxable') throw new Error('계산 규칙이 확인되지 않은 유형입니다.')
  return divide(BigInt(supply), 10n, rounding).toString()
}
export function inclusiveAmount(total: string, rounding: Rounding = 'floor') {
  if (!/^\d{1,15}$/.test(total)) throw new Error('공급대가를 확인하세요.')
  const supply = divide(BigInt(total) * 10n, 11n, rounding)
  return { supply: supply.toString(), vat: (BigInt(total) - supply).toString() }
}
export interface AccountMapping { sales: string; purchase: string; vatSales: string; vatPurchase: string; cash: string; receivable: string; payable: string; cardSales: string; cardPurchase: string; additional: string }
export const emptyMapping = (): AccountMapping => ({ sales:'',purchase:'',vatSales:'',vatPurchase:'',cash:'',receivable:'',payable:'',cardSales:'',cardPurchase:'',additional:'' })
export function autoJournal(draft: SalesDraft, type: VatType, mapping: AccountMapping): JournalLine[] {
  if (draft.journalType === '0') return []
  if (draft.journalType === '3') throw new Error('혼합 분개는 하단에서 직접 입력하세요.')
  const sale = type.direction === 'sales'
  const counterpart = draft.journalType === '1' ? mapping.cash : draft.journalType === '4' ? (sale ? mapping.cardSales : mapping.cardPurchase) : draft.journalType === '5' ? mapping.additional : (sale ? mapping.receivable : mapping.payable)
  const main = sale ? mapping.sales : mapping.purchase
  const tax = sale ? mapping.vatSales : mapping.vatPurchase
  const supply = BigInt(draft.supply), vat = BigInt(draft.vat)
  if (!counterpart || !main || (vat && draft.type !== '54' && !tax)) throw new Error('환경설정에서 회사 계정과목을 먼저 연결하세요.')
  const lines: JournalLine[] = [{side:sale?'debit':'credit',account:counterpart,amount:(supply+vat).toString(),memo:draft.memo}]
  if (supply || draft.type === '54') lines.push({side:sale?'credit':'debit',account:main,amount:(supply+(draft.type==='54'?vat:0n)).toString(),memo:draft.memo})
  if (vat && draft.type !== '54') lines.push({side:sale?'credit':'debit',account:tax,amount:vat.toString(),memo:draft.memo})
  return lines.filter(line=>BigInt(line.amount)>0n)
}
export function itemTotals(items: VoucherItem[]) {
  return {supply:items.reduce((n,i)=>n+BigInt(i.supply),0n).toString(),vat:items.reduce((n,i)=>n+BigInt(i.vat),0n).toString()}
}
export function duplicates(rows: SalesRecord[]) {
  const groups = new Map<string,SalesRecord[]>()
  for (const row of rows) {
    const key = JSON.stringify([row.date,row.partnerId,row.type,row.supply,row.vat,row.evidenceNumber ?? ''])
    groups.set(key,[...(groups.get(key) ?? []),row])
  }
  return [...groups.values()].filter(group=>group.length>1)
}
export function summarize(rows: SalesRecord[]) {
  const groups = new Map<string,{type:string;partner:string;electronic:boolean;count:number;supply:string;vat:string}>()
  for (const row of rows) {
    const key=JSON.stringify([row.type,row.partnerId,!!row.electronic])
    const group=groups.get(key) ?? {type:row.type,partner:row.partner,electronic:!!row.electronic,count:0,supply:'0',vat:'0'}
    group.count++;group.supply=(BigInt(group.supply)+BigInt(row.supply)).toString();group.vat=(BigInt(group.vat)+BigInt(row.vat)).toString();groups.set(key,group)
  }
  return [...groups.values()]
}

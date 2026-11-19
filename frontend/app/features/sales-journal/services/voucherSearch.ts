import type { SalesRecord } from './salesJournal.ts'
import { duplicates } from './voucherCalculation.ts'
export interface AdvancedFilter {number?:string;partner?:string;item?:string;memo?:string;direction?:string;type?:string;journalType?:string;electronic?:string;supplyMin?:string;supplyMax?:string;vatMin?:string;vatMax?:string;unbalanced?:boolean;duplicatesOnly?:boolean}
export function advancedSearch(rows:SalesRecord[],filter:AdvancedFilter){
 const duplicateIds=filter.duplicatesOnly?new Set(duplicates(rows).flat().map(row=>row.id)):null
 const includes=(value:string,query?:string)=>!query||value.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())
 return rows.filter(row=>includes(row.entryNumber,filter.number)&&includes(row.partner+' '+row.partnerCode,filter.partner)&&includes(row.item,filter.item)&&includes(row.memo+' '+row.lines.map(l=>l.memo).join(' '),filter.memo)
 &&(!filter.direction||(Number(row.type)<50?'sales':'purchase')===filter.direction)&&(!filter.type||row.type===filter.type)&&(!filter.journalType||row.journalType===filter.journalType)
 &&(!filter.electronic||!!row.electronic===(filter.electronic==='yes'))&&(!filter.supplyMin||BigInt(row.supply)>=BigInt(filter.supplyMin))&&(!filter.supplyMax||BigInt(row.supply)<=BigInt(filter.supplyMax))
 &&(!filter.vatMin||BigInt(row.vat)>=BigInt(filter.vatMin))&&(!filter.vatMax||BigInt(row.vat)<=BigInt(filter.vatMax))&&(!duplicateIds||duplicateIds.has(row.id))
 &&(!filter.unbalanced||row.lines.reduce((n,l)=>n+(l.side==='debit'?1n:-1n)*BigInt(l.amount),0n)!==0n))
}

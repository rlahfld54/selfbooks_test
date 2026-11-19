import test from 'node:test'
import assert from 'node:assert/strict'
import { autoJournal, calculateVat, emptyMapping, inclusiveAmount, supplyFromQuantity, itemTotals, duplicates, summarize } from '../app/features/sales-journal/services/voucherCalculation.ts'
import { emptyDraft, type SalesRecord } from '../app/features/sales-journal/services/salesJournal.ts'
test('scenario A: large card sale remains exact and balanced',()=>{
 const draft={...emptyDraft(),type:'17',journalType:'4',supply:'1090909091',vat:calculateVat('1090909091','taxable')}
 assert.equal(draft.vat,'109090909')
 const lines=autoJournal(draft,{code:'17',name:'카과',direction:'sales',taxCategory:'taxable',enabled:true},{...emptyMapping(),sales:'1',vatSales:'2',cardSales:'3'})
 assert.equal(lines.find(l=>l.side==='debit')?.amount,'1200000000')
 assert.equal(lines.filter(l=>l.side==='credit').reduce((n,l)=>n+BigInt(l.amount),0n),1200000000n)
})
test('scenario B: purchase credit, no journal, missing mappings and mixed entries',()=>{
 const draft={...emptyDraft(),type:'51',journalType:'2',supply:'1000000',vat:'100000'}
 const type={code:'51',name:'과세',direction:'purchase',taxCategory:'taxable',enabled:true}
 const mapping={...emptyMapping(),purchase:'1',vatPurchase:'2',payable:'3'}
 assert.equal(autoJournal(draft,type,mapping).find(l=>l.side==='credit')?.amount,'1100000')
 assert.deepEqual(autoJournal({...draft,journalType:'0'},type,mapping),[])
 assert.throws(()=>autoJournal(draft,type,emptyMapping()),/계정과목/)
 assert.throws(()=>autoJournal({...draft,journalType:'3'},type,mapping),/직접/)
 assert.equal(autoJournal({...draft,type:'54'},type,mapping).find(l=>l.side==='debit')?.amount,'1100000')
})
test('decimal quantities, rounding, inclusive amounts and non-taxable categories',()=>{
 assert.equal(supplyFromQuantity('0.1','0.2'),'0')
 assert.equal(supplyFromQuantity('2.5','1234.56'),'3086')
 assert.equal(supplyFromQuantity('2.5','1234.56','ceil'),'3087')
 assert.equal(calculateVat('105','taxable','round'),'11')
 assert.equal(calculateVat('109','taxable'),'10')
 assert.equal(calculateVat('999','zero'),'0')
 assert.equal(calculateVat('999','exempt'),'0')
 assert.deepEqual(inclusiveAmount('1100000'),{supply:'1000000',vat:'100000'})
 assert.throws(()=>calculateVat('100','other'))
 for(const invalid of ['-1','1e2','NaN','0.1234567'])assert.throws(()=>supplyFromQuantity(invalid,'1'))
})
test('multiple items, duplicate evidence and summary totals',()=>{
 const items=[{name:'a',quantity:'1',unitPrice:'100',supply:'100',vat:'10'},{name:'b',quantity:'2',unitPrice:'50',supply:'100',vat:'10'}]
 assert.deepEqual(itemTotals(items),{supply:'200',vat:'20'})
 const base={...emptyDraft(),partner:'A',partnerCode:'',partnerId:'a',supply:'100',vat:'10',date:'2026-11-10',status:'draft',entryNumber:'1',needsReview:false} as SalesRecord
 assert.equal(duplicates([{...base,id:'1'},{...base,id:'2'}]).length,1)
 assert.equal(duplicates([{...base,id:'1',evidenceNumber:'a'},{...base,id:'2',evidenceNumber:'b'}]).length,0)
 assert.equal(summarize([base,base])[0]?.supply,'200')
})

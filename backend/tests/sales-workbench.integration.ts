import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadConfig} from '../src/config/env.js';
import {createPool} from '../src/db/pool.js';
import {createSalesContext} from '../src/services/sales-context.js';
import {createSalesRepository} from '../src/services/sales-repository.js';
import {validateSales} from '../src/services/sales-validation.js';
const config=loadConfig();
if(!config.development||!config.databaseUrl||!config.fixtures)throw new Error('Development configuration required');
const context=createSalesContext(config.fixtures)!;
if(!context)throw new Error('Explicit company required');
const pool=createPool(config.databaseUrl,config.caPath),repo=createSalesRepository(pool,{...context,userId:'integration-test'});
const ids:string[]=[];let partnerId='';
try {
 const meta=await repo.metadata(); assert.ok(meta.accounts.length>=3);
 const partner=await repo.createPartner({name:'전표 통합검증 임시 거래처',code:'TEST-'+randomUUID().slice(0,12),businessNumber:''});partnerId=partner.id;
 const period=meta.periods.find(p=>p.status==='open');assert.ok(period);
 const input=validateSales({id:randomUUID(),version:0,date:'2026-11-10',periodId:period.id,partnerId,type:'51',item:'통합검증',supply:'1000000',vat:'100000',payment:'외상',memo:'',zeroVatConfirmed:false,journalType:'2',lines:[{side:'debit',account:meta.accounts[0].id,amount:'1000000',memo:''},{side:'debit',account:meta.accounts[1].id,amount:'100000',memo:''},{side:'credit',account:meta.accounts[2].id,amount:'1100000',memo:''}]});ids.push(input.id);
 let saved=await repo.save(input,false);assert.equal(saved.supply,'1000000');assert.equal(saved.lines.length,3);
 assert.equal((await repo.list()).find(r=>r.id===input.id)?.vat,'100000');
 await assert.rejects(repo.save({...input,version:9},true),/다른 창/);
 saved=await repo.save({...input,version:saved.version,item:'수정 검증'},true);assert.equal(saved.item,'수정 검증');
 const copies=await repo.batch('copy',[{id:saved.id,version:saved.version}],{date:'2026-11-11',periodId:period.id});ids.push(...copies.map(r=>r.id));assert.equal(copies[0].date,'2026-11-11');assert.notEqual(copies[0].entryNumber,saved.entryNumber);
 const moved=await repo.batch('move',[{id:saved.id,version:saved.version}],{date:'2026-11-12',periodId:period.id});saved=moved[0];assert.equal(saved.date,'2026-11-12');
 const before=saved.version;
 await assert.rejects(repo.batch('bulk',[{id:saved.id,version:saved.version},{id:randomUUID(),version:1}],{item:'롤백해야 함'}));
 assert.equal((await repo.list()).find(r=>r.id===saved.id)?.version,before);
 await repo.remove(saved.id,saved.version);assert.ok(!(await repo.list()).some(r=>r.id===saved.id));
 const removed=(await repo.deleted()).find(r=>r.id===saved.id);assert.equal(removed.lines.length,3);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM public.journal_lines WHERE entry_id=$1',[saved.id])).rows[0].n,0);
 saved=await repo.restore(saved.id,removed.version);assert.equal(saved.lines.length,3);
 assert.ok((await repo.history(saved.id)).some(h=>h.action==='restore'));
 await assert.rejects(createSalesRepository(pool,{...context,companyId:randomUUID()}).list(),/회사/);
 const concurrent=await Promise.all(Array.from({length:3},async()=>{const id=randomUUID();ids.push(id);return repo.save({...input,id},false)}));assert.equal(new Set(concurrent.map(r=>r.entryNumber)).size,3);
 console.log('PASS: real DB create/read/update/copy/move/delete/restore/audit/atomic rollback/company isolation/concurrent unique numbers');
} finally {
 const db=await pool.connect();try{await db.query('BEGIN');for(const table of ['sales_voucher_audit','journal_lines','sales_vouchers'])await db.query(`DELETE FROM public.${table} WHERE office_id=$1 AND client_id=$2 AND entry_id=ANY($3::uuid[])`,[context.officeId,context.companyId,ids]);await db.query('DELETE FROM public.journal_entries WHERE office_id=$1 AND client_id=$2 AND id=ANY($3::uuid[])',[context.officeId,context.companyId,ids]);if(partnerId)await db.query('DELETE FROM public.business_partners WHERE office_id=$1 AND client_id=$2 AND id=$3',[context.officeId,context.companyId,partnerId]);await db.query('COMMIT')}catch(e){await db.query('ROLLBACK');throw e}finally{db.release();await pool.end()}
}

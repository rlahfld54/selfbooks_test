<script setup lang="ts">
import type { SalesMeta, SalesRecord } from './services/salesJournal'
import { createSalesJournalService } from './services/salesJournal'
import { duplicates, summarize } from './services/voucherCalculation'
import { useBackendApi } from '~/composables/useBackendApi'
import { formatAmount } from '~/utils/formatAmount'
const props=defineProps<{rows:SalesRecord[];allRows:SalesRecord[];selected:SalesRecord[];meta?:SalesMeta;dirty:boolean;preview:boolean}>()
const emit=defineEmits<{refresh:[];filter:[type:string];pin:[];items:[];search:[];preferences:[]}>()
const service=createSalesJournalService(useBackendApi(15000))
const route=useRoute()
const cashAccount=ref('')
const cashLines=computed(()=>props.rows.flatMap(row=>row.lines.filter(line=>line.account===cashAccount.value).map(line=>({date:row.date,partner:row.partner,...line}))))
const cashMovement=computed(()=>cashLines.value.reduce((n,line)=>n+(line.side==='debit'?1n:-1n)*BigInt(line.amount),0n).toString())
const modal=ref(''),error=ref(''),busy=ref(false),date=ref(''),periodId=ref(''),memo=ref(''),changeMemo=ref(false),bulkField=ref('electronic'),bulkValue=ref('true')
const deleted=ref<SalesRecord[]>([]),history=ref<Awaited<ReturnType<typeof service.history>>['data']>([])
const summaryScope=ref('all'),month=ref('')
const historyRows=computed(()=>props.allRows.filter(row=>props.selected[0]?.partnerId===row.partnerId))
const summaryRows=computed(()=>{
  if(summaryScope.value==='all')return props.rows
  if(!/^\d{4}-\d{2}$/.test(month.value))return []
  const target=Number(month.value.slice(5,7))
  return props.allRows.filter(row=>row.date.slice(0,4)===month.value.slice(0,4)&&(summaryScope.value==='month'?row.date.slice(0,7)===month.value:Math.floor((Number(row.date.slice(5,7))-1)/3)===Math.floor((target-1)/3)))
})
const groups=computed(()=>summarize(summaryRows.value)),suspects=computed(()=>duplicates(props.rows))
async function run(action:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';try{await action()}catch(e){error.value=e instanceof Error?e.message:'처리하지 못했습니다.'}finally{busy.value=false}}
function open(name:string){error.value='';modal.value=name;date.value=props.selected[0]?.date??'';periodId.value=props.selected[0]?.periodId??props.meta?.periods[0]?.id??'';month.value=date.value.slice(0,7)||props.rows[0]?.date.slice(0,7)||'';changeMemo.value=false;if(name==='deleted'&&!props.preview)void run(async()=>{deleted.value=(await service.deleted()).data});if(name==='history'&&props.selected[0]&&!props.preview)void run(async()=>{history.value=(await service.history(props.selected[0]!.id)).data})}
async function apply(){await run(async()=>{if(props.preview||props.dirty)throw new Error('미저장 내용을 저장한 후 실행하세요. 공개 미리보기는 DB 작업을 지원하지 않습니다.');const changes=modal.value==='bulk'?{[bulkField.value]:bulkField.value==='electronic'?bulkValue.value==='true':bulkValue.value}:{date:date.value,periodId:periodId.value,...(changeMemo.value?{memo:memo.value}:{})};await service.batch(modal.value as 'copy'|'move'|'bulk',props.selected,changes);modal.value='';emit('refresh')})}
async function restore(row:SalesRecord){await run(async()=>{await service.restore(row);deleted.value=deleted.value.filter(r=>r.id!==row.id);emit('refresh')})}
function exportRows(){return props.selected.length?props.selected:props.rows}
function dataRows(){return exportRows().map(row=>({'일자':row.date,'번호':row.entryNumber,'유형':row.type,'거래처':row.partner,'사업자번호':row.partnerCode,'품목':row.item,'공급가액':row.supply,'부가세':row.vat,'전자':row.electronic?'전자':'종이','적요':row.memo}))}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csv(){const rows=dataRows();if(!rows.length)return;const cell=(value:string)=>'"'+(/^[=+\-@\t\r]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';download(new Blob(['\ufeff'+[Object.keys(rows[0]!),...rows.map(Object.values)].map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'매입매출전표.csv')}
async function excel(){await run(async()=>{const XLSX=await import('xlsx');const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(dataRows()),'매입매출');XLSX.writeFile(book,'매입매출전표.xlsx')})}
function print(){modal.value='print'}
function printNow(){window.print()}
function shortcut(event:KeyboardEvent){if(route.path!=='/sales-journal'||event.isComposing||event.keyCode===229||event.altKey||event.metaKey||document.querySelector('dialog[open]'))return
  const keys:Record<string,()=>void>={'F3':()=>open('funds'),'F4':()=>open('copy'),'F6':()=>emit('search'),'F7':()=>emit('items'),'F8':()=>open('past'),'F11':()=>open('summary'),'Shift+F3':()=>open('move'),'Ctrl+F2':()=>emit('preferences'),'Ctrl+F5':()=>open('deleted'),'Ctrl+F8':()=>open('past'),'Ctrl+F9':()=>emit('pin')}
  const action=keys[(event.ctrlKey?'Ctrl+':event.shiftKey?'Shift+':'')+event.key];if(action){event.preventDefault();action()}}
onMounted(()=>window.addEventListener('keydown',shortcut));onBeforeUnmount(()=>window.removeEventListener('keydown',shortcut))
defineExpose({open})
</script>
<template>
  <div class="operations">
    <UiButton @click="open('funds')">F3 자금관리</UiButton>
    <UiButton :disabled="!selected.length||dirty||preview" @click="open('copy')">F4 복사</UiButton><UiButton :disabled="!selected.length||dirty||preview" @click="open('move')">Shift+F3 이동</UiButton>
    <UiButton @click="emit('search')">F6 검색</UiButton><UiButton @click="emit('items')">F7 복수거래</UiButton><UiButton @click="open('past')">F8 과거자료</UiButton><UiButton @click="open('summary')">F11 간편집계</UiButton>
    <UiButton :disabled="!selected.length||dirty||preview" @click="open('bulk')">일괄변경</UiButton><UiButton @click="open('duplicates')">중복 의심</UiButton><UiButton :disabled="preview" @click="open('deleted')">삭제자료·복원</UiButton><UiButton :disabled="selected.length!==1||preview" @click="open('history')">수정 이력</UiButton>
    <UiButton @click="csv">CSV</UiButton><UiButton @click="excel">Excel</UiButton><UiButton @click="print">전표 인쇄</UiButton><UiButton @click="emit('pin')">하단 전표 고정 전환</UiButton><UiButton @click="emit('preferences')">탭 설정</UiButton>
    <p v-if="error&&!modal" role="alert">{{ error }}</p>
  </div>
  <UiModal :open="!!modal" :title="({funds:'조회 범위 계정별 자금 내역',copy:'전표 복사',move:'전표 이동',bulk:'일괄변경 미리보기',summary:'간편집계',deleted:'삭제자료·복원',history:'전표 수정 이력',past:'동일 거래처 과거 전표',duplicates:'중복 의심 전표',print:'선택 전표 인쇄 미리보기'} as Record<string,string>)[modal]??'전표 작업'" size="large" @close="!busy&&(modal='')">
    <p v-if="error" role="alert">{{ error }}</p><p v-if="busy" role="status">처리 중…</p>
    <template v-if="modal==='funds'"><p>현재 조회한 매입매출전표의 계정별 증감입니다. 기초잔액과 일반전표를 포함한 실제 현금잔액은 아닙니다.</p><select v-model="cashAccount" aria-label="자금 조회 계정"><option value="">계정 선택</option><option v-for="account in meta?.accounts" :key="account.id" :value="account.id">{{ account.code }} {{ account.name }}</option></select><p>조회기간 순증감 {{ formatAmount(cashMovement) }}</p><table><tbody><tr v-for="(line,index) in cashLines" :key="index"><td>{{ line.date }}</td><td>{{ line.partner }}</td><td>{{ line.side==='debit'?'차변':'대변' }}</td><td>{{ formatAmount(line.amount) }}</td><td>{{ line.memo }}</td></tr></tbody></table></template>
    <div v-if="['copy','move','bulk'].includes(modal)" class="batch">
      <p>{{ selected.length }}건에 적용합니다. 마감·확정·버전 충돌이 한 건이라도 있으면 전체 취소됩니다. 미저장 전표는 먼저 저장하세요.</p>
      <template v-if="modal!=='bulk'"><label>대상 일자<input v-model="date" type="date" /></label><label>회계기간<select v-model="periodId"><option v-for="period in meta?.periods" :key="period.id" :value="period.id">{{ period.label }}</option></select></label><label><input v-model="changeMemo" type="checkbox" />전표 적요 변경</label><input v-if="changeMemo" v-model="memo" maxlength="500" aria-label="변경 적요" /><p>기존 분개를 포함합니다. 전표번호는 기존 UUID 정책을 유지합니다.</p></template>
      <template v-else><label>변경 항목<select v-model="bulkField" @change="bulkValue=bulkField==='electronic'?'true':''"><option value="electronic">전자 여부</option><option value="item">품목</option><option value="memo">전표 적요</option></select></label><select v-if="bulkField==='electronic'" v-model="bulkValue"><option value="true">전자</option><option value="false">종이</option></select><input v-else v-model="bulkValue" :maxlength="bulkField==='item'?200:500" aria-label="일괄 변경값" /></template>
      <table><thead><tr><th>전표</th><th>현재 일자</th><th>현재 값</th><th>변경 후</th></tr></thead><tbody><tr v-for="row in selected" :key="row.id"><td>{{ row.entryNumber }}</td><td>{{ row.date }}</td><td>{{ modal==='bulk'?bulkField==='electronic'?(row.electronic?'전자':'종이'):bulkField==='item'?row.item:row.memo:row.date }}</td><td>{{ modal==='bulk'?bulkValue:date }}</td></tr></tbody></table>
      <UiButton :disabled="busy||dirty||preview||!selected.length" @click="apply">{{ selected.length }}건 적용</UiButton>
    </div>
    <template v-if="modal==='summary'"><select v-model="summaryScope" aria-label="집계 기간"><option value="all">조회기간 전체</option><option value="month">지정 월</option><option value="quarter">해당 분기</option></select><input v-if="summaryScope!=='all'" v-model="month" type="month" /><table><thead><tr><th>유형</th><th>거래처</th><th>증빙</th><th>건수</th><th>공급가액</th><th>부가세</th></tr></thead><tbody><tr v-for="(group,index) in groups" :key="index"><td><button @click="emit('filter',group.type);modal=''">{{ group.type }}</button></td><td>{{ group.partner }}</td><td>{{ group.electronic?'전자':'종이' }}</td><td>{{ group.count }}</td><td>{{ formatAmount(group.supply) }}</td><td>{{ formatAmount(group.vat) }}</td></tr></tbody></table></template>
    <template v-if="modal==='deleted'"><p>삭제 시 활성 분개에서 제외한 전표입니다. 열린 회계기간에만 복원할 수 있습니다.</p><table><tbody><tr v-for="row in deleted" :key="row.id"><td>{{ row.date }}</td><td>{{ row.partner }}</td><td>{{ row.item }}</td><td>{{ formatAmount(row.supply) }}</td><td><UiButton :disabled="busy||dirty" @click="restore(row)">복원</UiButton></td></tr></tbody></table><p v-if="!deleted.length">삭제자료가 없습니다.</p></template>
    <template v-if="modal==='history'"><details v-for="(entry,index) in history" :key="index"><summary>{{ entry.createdAt }} · {{ entry.action }} · {{ entry.actor }}</summary><pre>{{ JSON.stringify({before:entry.before,after:entry.after},null,2) }}</pre></details></template>
    <template v-if="modal==='past'"><p>선택 거래처의 조회 가능한 자료입니다. 원본은 이 창에서 수정하지 않습니다.</p><table><tbody><tr v-for="row in historyRows" :key="row.id"><td>{{ row.date }}</td><td>{{ row.item }}</td><td>{{ formatAmount(row.supply) }}</td><td><details><summary>분개</summary><p v-for="(line,index) in row.lines" :key="index">{{ line.side==='debit'?'차변':'대변' }} {{ meta?.accounts.find(a=>a.id===line.account)?.name }} {{ formatAmount(line.amount) }} {{ line.memo }}</p></details></td></tr></tbody></table></template>
    <template v-if="modal==='duplicates'"><p>동일 일자·거래처·유형·공급가액·세액·증빙번호가 일치하는 자료입니다. 실제 중복 여부를 확인하세요.</p><div v-for="(group,index) in suspects" :key="index"><p v-for="row in group" :key="row.id">{{ row.date }} {{ row.entryNumber }} {{ row.partner }} {{ formatAmount(row.supply) }}</p><hr /></div><p v-if="!suspects.length">중복 의심 자료가 없습니다.</p></template>
    <div v-if="modal==='print'" class="voucher-print"><p>회계 전표 출력용이며 세금계산서 발행 문서가 아닙니다.</p><article v-for="row in exportRows()" :key="row.id"><h3>{{ row.entryNumber }} · {{ row.date }}</h3><p>{{ row.partner }} / {{ row.item }} / 공급가액 {{ formatAmount(row.supply) }} / 부가세 {{ formatAmount(row.vat) }}</p><table><tbody><tr v-for="(line,index) in row.lines" :key="index"><td>{{ line.side==='debit'?'차변':'대변' }}</td><td>{{ meta?.accounts.find(a=>a.id===line.account)?.name }}</td><td>{{ formatAmount(line.amount) }}</td><td>{{ line.memo }}</td></tr></tbody></table></article><UiButton @click="printNow">인쇄</UiButton></div>
  </UiModal>
</template>
<style scoped>
.operations{display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:var(--surface)}.operations :deep(button){font-size:12px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}th,td{padding:8px;border:1px solid var(--border);text-align:left}.batch label{display:inline-flex;gap:8px;margin:8px}.batch input,.batch select{padding:6px;max-width:100%}pre{white-space:pre-wrap;font-size:12px;max-height:350px;overflow:auto}.voucher-print article{break-inside:avoid;margin:16px 0}
</style>
<style>
@media print{body>*{visibility:hidden}dialog[open],dialog[open] *{visibility:visible}dialog[open]{position:absolute;inset:0;max-width:none;width:100%;max-height:none;overflow:visible;border:0}dialog[open] button,dialog[open] header{display:none}dialog::backdrop{background:none}}
</style>

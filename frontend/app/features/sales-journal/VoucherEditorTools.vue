<script setup lang="ts">
import type { SalesDraft, SalesMeta, VoucherItem } from './services/salesJournal'
import { autoJournal, calculateVat, emptyMapping, inclusiveAmount, itemTotals, supplyFromQuantity, type AccountMapping, type Rounding } from './services/voucherCalculation'
import { createSalesJournalService } from './services/salesJournal'
import { useBackendApi } from '~/composables/useBackendApi'
const props = defineProps<{ draft: SalesDraft; meta: SalesMeta; locked: boolean }>()
const emit = defineEmits<{ edit: []; taxEdit: []; refresh: [] }>()
const service=createSalesJournalService(useBackendApi(15000))
const partnerOpen=ref(false),partnerBusy=ref(false),partner=reactive({name:'',code:'',businessNumber:''})
async function createPartner(){partnerBusy.value=true;error.value='';try{const result=await service.createPartner(partner);props.draft.partnerId=result.data.id;emit('edit');emit('refresh');partnerOpen.value=false}catch(e){error.value=e instanceof Error?e.message:'거래처를 등록하지 못했습니다.'}finally{partnerBusy.value=false}}
const settings = ref(false), multiple = ref(false), regenerate = ref(false), error = ref('')
const mapping = reactive(emptyMapping())
const rounding = ref<Rounding>('floor'), gross = ref('0')
const items = ref<VoucherItem[]>([])
const type = computed(() => props.meta.vatTypes?.find(t=>t.code===props.draft.type) ?? {code:props.draft.type,name:'과세',direction:props.draft.type==='11'?'sales':'purchase',taxCategory:'taxable',enabled:true})
const key = computed(()=>`aat:sales-settings:v1:${props.meta.user}:${props.meta.companyId??props.meta.company}:${props.meta.establishmentId??props.meta.establishment}`)
const accountLabels: Record<keyof AccountMapping,string> = {sales:'매출',purchase:'매입',vatSales:'부가세예수금',vatPurchase:'부가세대급금',cash:'현금',receivable:'외상매출금',payable:'외상매입금',cardSales:'카드 매출채권',cardPurchase:'카드 미지급금',additional:'추가 상대계정'}
onMounted(()=>{try { const saved=JSON.parse(localStorage.getItem(key.value)??'null'); if(saved){for(const name of Object.keys(mapping) as (keyof AccountMapping)[]) if(props.meta.accounts.some(a=>a.id===saved.mapping?.[name])) mapping[name]=saved.mapping[name]; if(['floor','round','ceil'].includes(saved.rounding)) rounding.value=saved.rounding} }catch{error.value='환경설정을 읽지 못해 기본값을 사용합니다.'}})
function attempt(action:()=>void){error.value='';try{action()}catch(e){error.value=e instanceof Error?e.message:'입력값을 확인하세요.'}}
function tax(){attempt(()=>{props.draft.vat=calculateVat(props.draft.supply,type.value.taxCategory,rounding.value);emit('taxEdit')})}
function generate(){attempt(()=>{props.draft.lines=autoJournal(props.draft,type.value,mapping);emit('edit');regenerate.value=false})}
function requestGenerate(){if(props.draft.lines.length)regenerate.value=true;else generate()}
function calculateSupply(){attempt(()=>{props.draft.supply=supplyFromQuantity(props.draft.quantity??'1',props.draft.unitPrice??'0',rounding.value);tax();emit('taxEdit')})}
function openItems(){if(props.locked)return;items.value=(props.draft.items??[]).map(i=>({...i}));multiple.value=true}
function addItem(){items.value.push({name:'',quantity:'1',unitPrice:'0',supply:'0',vat:'0'})}
function calculateItem(item:VoucherItem){attempt(()=>{item.supply=supplyFromQuantity(item.quantity,item.unitPrice,rounding.value);item.vat=calculateVat(item.supply,type.value.taxCategory,rounding.value)})}
function applyItems(){attempt(()=>{if(!items.value.length)throw new Error('품목을 한 개 이상 입력하세요.');const totals=itemTotals(items.value);props.draft.items=items.value.map(i=>({...i}));Object.assign(props.draft,totals);props.draft.item=items.value[0]?.name??'';emit('taxEdit');multiple.value=false})}
function saveSettings(){attempt(()=>{localStorage.setItem(key.value,JSON.stringify({mapping,rounding:rounding.value}));settings.value=false})}
defineExpose({openItems,openSettings:()=>{settings.value=true}})
</script>
<template>
  <section class="editor-tools" aria-label="세액 및 자동분개 도구">
    <p v-if="error" role="alert" class="field-error">{{ error }}</p>
    <fieldset :disabled="locked">
      <label>수량<input v-model="draft.quantity" @input="emit('edit')" inputmode="decimal" /></label><label>단가<input v-model="draft.unitPrice" @input="emit('edit')" inputmode="decimal" /></label>
      <UiButton @click="calculateSupply">수량 × 단가 적용</UiButton><UiButton @click="tax">세액 계산</UiButton>
      <label>공급대가<input v-model="gross" inputmode="numeric" /></label><UiButton @click="attempt(()=>{if(type.taxCategory!=='taxable')throw new Error('10% 과세 유형만 역산할 수 있습니다.');Object.assign(draft,inclusiveAmount(gross,rounding));emit('taxEdit')})">포함금액 역산</UiButton>
      <label>분개유형<select aria-label="분개유형" v-model="draft.journalType" @change="emit('edit')"><option value="">기존 수기분개</option><option value="0">0 분개없음</option><option value="1">1 현금</option><option value="2">2 외상</option><option value="3">3 혼합</option><option value="4">4 카드</option><option value="5">5 추가</option></select></label>
      <UiButton @click="requestGenerate">자동분개 생성</UiButton><UiButton @click="openItems">F7 복수거래</UiButton>
      <label><input v-model="draft.electronic" type="checkbox" @change="emit('edit')" />전자증빙</label>
      <label>카드사<input v-model="draft.cardCompany" maxlength="100" @input="emit('edit')" /></label>
      <label>증빙 식별번호<input v-model="draft.evidenceNumber" maxlength="100" @input="emit('edit')" /></label>
      <label v-if="draft.type==='54'">불공제 사유<input v-model="draft.nonDeductionReason" maxlength="200" @input="emit('edit')" /></label>
    </fieldset>
    <UiButton @click="settings=true">입력·자동분개 환경설정</UiButton>
    <UiButton @click="partnerOpen=true">거래처 신규등록</UiButton>
    <p>계산 버튼을 누를 때만 금액을 변경합니다. 상단 금액 변경 후 수동 분개를 덮어쓰려면 재생성을 확인하세요.</p>
    <UiModal :open="settings" title="입력 환경설정" @close="settings=false">
      <p>현재 사용자·회사·사업장별 브라우저 설정입니다. 계정과목 마스터에서 직접 지정합니다.</p>
      <label>원 미만 처리<select v-model="rounding"><option value="floor">절사</option><option value="round">반올림</option><option value="ceil">올림</option></select></label>
      <div class="mapping"><label v-for="(label,name) in accountLabels" :key="name">{{ label }}<select v-model="mapping[name]" :aria-label="label"><option value="">선택하세요</option><option v-for="account in meta.accounts" :key="account.id" :value="account.id">{{ account.code }} {{ account.name }}</option></select></label></div>
      <template #footer><UiButton @click="saveSettings">설정 저장</UiButton></template>
    </UiModal>
    <UiModal :open="multiple" title="복수거래 입력" size="large" @close="multiple=false">
      <p>계산 후 공급가액·세액은 직접 수정할 수 있습니다. 적용하면 상단 합계가 변경됩니다.</p>
      <div class="items"><table><thead><tr><th>품목</th><th>수량</th><th>단가</th><th>공급가액</th><th>부가세</th><th>작업</th></tr></thead><tbody><tr v-for="(item,index) in items" :key="index"><td><input v-model="item.name" aria-label="품목명" /></td><td><input v-model="item.quantity" aria-label="품목 수량" /></td><td><input v-model="item.unitPrice" aria-label="품목 단가" /></td><td><input v-model="item.supply" aria-label="품목 공급가액" /></td><td><input v-model="item.vat" aria-label="품목 부가세" /></td><td><UiButton @click="calculateItem(item)">계산</UiButton><UiButton @click="items.splice(index,1)">제거</UiButton></td></tr></tbody></table></div>
      <p v-if="error" role="alert">{{ error }}</p>
      <template #footer><UiButton :disabled="items.length>=100" @click="addItem">품목 추가</UiButton><UiButton @click="applyItems">합계 적용</UiButton></template>
    </UiModal>
    <ConfirmDialog :open="regenerate" title="분개를 다시 생성할까요?" message="기존 수동 분개가 새 자동분개로 바뀝니다." confirm-label="재생성" @cancel="regenerate=false" @confirm="generate" />
    <UiModal :open="partnerOpen" title="회사 거래처 신규등록" @close="!partnerBusy&&(partnerOpen=false)"><p>현재 서버 회사에 등록합니다. 주민등록번호는 입력하지 않습니다.</p><label>거래처 코드<input v-model="partner.code" maxlength="30" /></label><label>상호<input v-model="partner.name" maxlength="200" /></label><label>사업자등록번호<input v-model="partner.businessNumber" maxlength="10" /></label><p v-if="error" role="alert">{{ error }}</p><template #footer><UiButton :disabled="partnerBusy" @click="createPartner">등록 후 선택</UiButton></template></UiModal>
  </section>
</template>
<style scoped>
.editor-tools{background:var(--surface);padding:12px}.editor-tools fieldset{border:0;padding:0;display:flex;flex-wrap:wrap;gap:8px;align-items:end}.editor-tools label,.mapping label{display:grid;gap:4px;font-size:12px}input,select{padding:6px;border:1px solid var(--border);border-radius:4px;max-width:220px}input[type=checkbox]{width:auto}.editor-tools p{font-size:12px;color:var(--secondary)}.mapping{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.items{overflow:auto}.items input{width:110px}.items table{min-width:800px}
</style>

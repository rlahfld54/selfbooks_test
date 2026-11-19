<script setup lang="ts">
import type { SalesMeta } from './services/salesJournal'
const props=defineProps<{meta:SalesMeta;type:string;electronic:string}>()
const emit=defineEmits<{filter:[type:string,electronic:string]}>()
const open=ref(false),hidden=ref<string[]>([]),order=ref<string[]>([])
const all=computed(()=>[{code:'all',name:'전체입력'},{code:'electronic',name:'전자입력'},...(props.meta.vatTypes??[{code:'11',name:'매출과세',direction:'sales',enabled:true},{code:'51',name:'매입과세',direction:'purchase',enabled:true}]).filter(t=>t.enabled).map(t=>({code:t.code,name:`${t.code}. ${t.direction==='sales'?'매출':'매입'}${t.name}`})),{code:'paper',name:'종이증빙'}])
const ordered=computed(()=>[...all.value].sort((a,b)=>(order.value.indexOf(a.code)<0?999:order.value.indexOf(a.code))-(order.value.indexOf(b.code)<0?999:order.value.indexOf(b.code))))
const key=computed(()=>`aat:sales-tabs:v1:${props.meta.user}`)
onMounted(()=>{try{const settings=JSON.parse(localStorage.getItem(key.value)??'null');if(Array.isArray(settings?.hidden))hidden.value=settings.hidden;if(Array.isArray(settings?.order))order.value=settings.order}catch{}})
function save(){try{localStorage.setItem(key.value,JSON.stringify({hidden:hidden.value,order:order.value}));open.value=false}catch{error.value='설정을 저장하지 못했습니다.'}}
const error=ref('')
function move(code:string,offset:number){const values=ordered.value.map(t=>t.code);const i=values.indexOf(code),j=i+offset;if(j<0||j>=values.length)return;[values[i],values[j]]=[values[j]!,values[i]!];order.value=values}
function choose(code:string){emit('filter',['all','electronic','paper'].includes(code)?'':code,code==='electronic'?'yes':code==='paper'?'no':'')}
defineExpose({open:()=>{open.value=true}})
</script>
<template><nav class="vat-tabs" aria-label="부가세 유형"><button v-for="tab in ordered.filter(t=>!hidden.includes(t.code))" :key="tab.code" :class="{active:tab.code===type||(!type&&tab.code===(electronic==='yes'?'electronic':electronic==='no'?'paper':'all'))}" @click="choose(tab.code)">{{ tab.name }}</button></nav>
<UiModal :open="open" title="사용자별 유형 탭 설정" @close="open=false"><p v-if="error">{{ error }}</p><div v-for="tab in ordered" :key="tab.code" class="setting"><label><input v-model="hidden" :value="tab.code" type="checkbox" :disabled="tab.code==='all'" />숨김 {{ tab.name }}</label><UiButton @click="move(tab.code,-1)">위로</UiButton><UiButton @click="move(tab.code,1)">아래로</UiButton></div><template #footer><UiButton @click="save">저장</UiButton></template></UiModal></template>
<style scoped>.vat-tabs{display:flex;overflow:auto;border-bottom:1px solid var(--border)}.vat-tabs button{white-space:nowrap;background:var(--surface);color:var(--secondary);border:0;padding:10px 12px;font-size:12px;cursor:pointer}.vat-tabs button.active{color:var(--primary);background:var(--primary-light);box-shadow:inset 0 -2px var(--primary)}.setting{display:flex;align-items:center;gap:8px;margin:8px}.setting label{flex:1}</style>

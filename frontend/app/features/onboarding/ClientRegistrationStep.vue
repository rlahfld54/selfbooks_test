<script setup lang="ts">
import { ref } from 'vue'
import type { Client } from './types'
defineProps<{ clients: Client[] }>()
const emit = defineEmits<{ save: [client: Client]; remove: [id: string]; skip: [] }>()
const editing = ref(false)
const importing = ref(false)
const draft = ref<Client>({ id: '', name: '', type: '개인사업자', status: '정상' })
function edit(client?: Client) { draft.value = client ? { ...client } : { id: crypto.randomUUID(), name: '', type: '개인사업자', status: '정상' }; editing.value = true }
function save() { if (!draft.value.name.trim()) return; emit('save', { ...draft.value, name: draft.value.name.trim() }); editing.value = false }
</script>
<template>
  <div class="ob-section-toolbar"><span>등록 거래처 <strong>{{ clients.length }}개</strong></span><div><UiButton @click="importing = true">엑셀 가져오기</UiButton><UiButton @click="edit()"><UiIcon name="plus" :size="16" />거래처 추가</UiButton></div></div>
  <div class="ob-table-wrap"><table class="ob-table"><caption class="sr-only">등록 거래처 목록</caption><thead><tr><th>거래처명</th><th>사업자 구분</th><th>상태</th><th>관리</th></tr></thead><tbody><tr v-for="client in clients" :key="client.id"><td><strong>{{ client.name }}</strong></td><td>{{ client.type }}</td><td><span class="ob-status">{{ client.status }}</span></td><td><div class="ob-row-actions"><UiButton variant="ghost" :aria-label="`${client.name} 수정`" @click="edit(client)">수정</UiButton><UiButton variant="ghost" :aria-label="`${client.name} 삭제`" @click="emit('remove', client.id)">삭제</UiButton></div></td></tr><tr v-if="!clients.length"><td colspan="4">거래처를 추가하거나 나중에 등록해 주세요.</td></tr></tbody></table></div>
  <div class="ob-note">거래처는 나중에도 등록할 수 있습니다. 지금은 테스트 데이터로 시작해 보세요.<UiButton variant="ghost" @click="emit('skip')">나중에 등록하기 <UiIcon name="arrow" :size="14" /></UiButton></div>
  <UiModal :open="editing" title="거래처 정보" @close="editing = false"><form id="ob-client" class="ob-fields" @submit.prevent="save"><label class="ob-wide">거래처명 <b>*</b><input v-model="draft.name" required maxlength="100" /></label><label class="ob-wide">사업자 구분<select v-model="draft.type"><option>개인사업자</option><option>법인사업자</option></select></label></form><template #footer><UiButton @click="editing = false">취소</UiButton><UiButton type="submit" form="ob-client" variant="primary">거래처 저장</UiButton></template></UiModal>
  <UiModal :open="importing" title="엑셀 가져오기 안내" @close="importing = false"><p>엑셀 가져오기는 준비 중입니다. 현재는 거래처 추가 버튼으로 테스트 거래처를 등록할 수 있습니다. 파일을 업로드하거나 서버로 전송하지 않습니다.</p><template #footer><UiButton variant="primary" @click="importing = false">확인</UiButton></template></UiModal>
</template>

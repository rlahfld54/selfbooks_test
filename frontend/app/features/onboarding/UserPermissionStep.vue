<script setup lang="ts">
import { ref } from 'vue'
import type { Staff } from './types'
defineProps<{ staff: Staff[] }>()
const emit = defineEmits<{ add: [staff: Staff]; remove: [id: string] }>()
const inviting = ref(false)
const name = ref('')
const role = ref<Staff['role']>('직원')
function invite() {
  if (!name.value.trim()) return
  emit('add', { id: crypto.randomUUID(), name: name.value.trim(), role: role.value, status: '초대 대기' })
  inviting.value = false
}
</script>
<template>
  <div class="ob-section-toolbar"><span>함께 일하는 사용자 <strong>{{ staff.length }}명</strong></span><UiButton @click="name = ''; role = '직원'; inviting = true"><UiIcon name="plus" :size="16" />직원 초대</UiButton></div>
  <div class="ob-table-wrap"><table class="ob-table"><caption class="sr-only">사용자 및 권한 목록</caption><thead><tr><th>이름</th><th>권한</th><th>상태</th><th>관리</th></tr></thead><tbody>
    <tr v-for="person in staff" :key="person.id"><td><input v-model="person.name" :aria-label="`${person.name} 직원 이름`" /></td><td><select v-model="person.role" :aria-label="`${person.name} 권한`"><option>관리자</option><option>직원</option></select></td><td><span class="ob-status" :class="{ pending: person.status === '초대 대기' }">{{ person.status }}</span></td><td><UiButton variant="ghost" :aria-label="`${person.name} 삭제`" @click="emit('remove', person.id)">삭제</UiButton></td></tr>
    <tr v-if="!staff.length"><td colspan="4">등록된 직원이 없습니다. 직원을 초대해 보세요.</td></tr>
  </tbody></table></div>
  <p class="ob-note">관리자는 모든 설정을 관리하고, 직원은 담당 업무를 처리합니다. 초대는 화면에서만 반영되며 실제 초대 메시지는 발송되지 않습니다.</p>
  <UiModal :open="inviting" title="직원 초대" @close="inviting = false"><form id="ob-invite" class="ob-fields" @submit.prevent="invite"><label class="ob-wide">직원 이름 <b>*</b><input v-model="name" required maxlength="60" /></label><label class="ob-wide">권한<select v-model="role"><option>직원</option><option>관리자</option></select></label></form><template #footer><UiButton @click="inviting = false">취소</UiButton><UiButton type="submit" form="ob-invite" variant="primary">초대 추가</UiButton></template></UiModal>
</template>

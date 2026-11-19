<script setup lang="ts">
import type { MockAccount, MockSummary } from '../types'
const props = defineProps<{ modelValue: MockSummary; accounts: MockAccount[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: MockSummary] }>()
function update<K extends keyof MockSummary>(key: K, value: MockSummary[K]) { emit('update:modelValue', { ...props.modelValue, ...(key === 'isFixed' ? { typeCode: undefined } : {}), [key]: value }) }
</script>
<template>
  <div class="am-fields">
    <label>적요코드 *<UiInput :model-value="modelValue.code" maxlength="20" required @update:model-value="update('code', $event)" /></label>
    <label>적요명 *<UiInput :model-value="modelValue.name" maxlength="150" required @update:model-value="update('name', $event)" /></label>
    <label>연결 계정과목<select class="input" :value="modelValue.accountId" @change="update('accountId', Number(($event.target as HTMLSelectElement).value))"><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} {{ a.name }}</option></select></label>
    <label>차변/대변<select class="input" :value="modelValue.side" @change="update('side', ($event.target as HTMLSelectElement).value as MockSummary['side'])"><option value="UNKNOWN">미확정</option><option value="DEBIT">차변</option><option value="CREDIT">대변</option></select></label>
    <label class="am-checkbox"><input type="checkbox" :checked="modelValue.isFixed" @change="update('isFixed', ($event.target as HTMLInputElement).checked)"> 고정적요</label>
    <label class="am-checkbox"><input type="checkbox" :checked="modelValue.isActive" @change="update('isActive', ($event.target as HTMLInputElement).checked)"> 사용</label>
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import { accountCategories } from '../types'
import type { MockAccount } from '../types'
const props = defineProps<{ modelValue: MockAccount; accounts: MockAccount[] }>()
const categories = computed(() => accountCategories(props.accounts))
const emit = defineEmits<{ 'update:modelValue': [value: MockAccount] }>()
function update<K extends keyof MockAccount>(key: K, value: MockAccount[K]) { emit('update:modelValue', { ...props.modelValue, [key]: value }) }
function category(value: string) { emit('update:modelValue', { ...props.modelValue, category: value, subcategory: categories.value[value]?.[0] ?? '' }) }
</script>
<template>
  <div class="am-fields">
    <label>계정코드 <span>*</span><UiInput :model-value="modelValue.code" maxlength="20" required @update:model-value="update('code', $event)" /></label>
    <label>계정과목명 <span>*</span><UiInput :model-value="modelValue.name" maxlength="100" required @update:model-value="update('name', $event)" /></label>
    <label>출력용 명칭<UiInput :model-value="modelValue.displayName" maxlength="100" @update:model-value="update('displayName', $event)" /></label>
    <label>대분류<UiSelect :model-value="modelValue.category" :options="Object.keys(categories).map(value => ({ value, label: value }))" @update:model-value="category" /></label>
    <label>중분류<UiSelect :model-value="modelValue.subcategory" :options="categories[modelValue.category]?.length ? categories[modelValue.category]!.map(value => ({ value, label: value })) : [{ value: '', label: '해당 없음' }]" @update:model-value="update('subcategory', $event)" /></label>
    <label>계정 성격<select class="input" :value="modelValue.balanceSide" @change="update('balanceSide', ($event.target as HTMLSelectElement).value as MockAccount['balanceSide'])"><option value="DEBIT">차변</option><option value="CREDIT">대변</option></select></label>
    <label class="am-checkbox"><input type="checkbox" :checked="modelValue.isActive" @change="update('isActive', ($event.target as HTMLInputElement).checked)"> 사용</label>
  </div>
</template>


<script setup lang="ts">
import { computed } from 'vue'
import { classifyAccount } from '../classification'
import { accountCategories } from '../types'
import type { MockAccount } from '../types'
const props = defineProps<{
  modelValue: MockAccount
  accounts: MockAccount[]
  section?: 'basic' | 'advanced'
}>()
const categories = computed(() => accountCategories(props.accounts))
const emit = defineEmits<{ 'update:modelValue': [value: MockAccount] }>()
function update<K extends keyof MockAccount>(key: K, value: MockAccount[K]) {
  const group = key === 'code' ? classifyAccount(String(value)) : undefined
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
    ...(group && Number(value) < 1000 ? { category: group.nature, subcategory: group.mid } : {}),
  })
}
function category(value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    category: value,
    subcategory: categories.value[value]?.[0] ?? '',
  })
}
</script>
<template>
  <div class="am-fields">
    <div v-show="section !== 'advanced'" class="am-field-section">
      <label>
        계정코드
        <span>*</span>
        <UiInput
          :model-value="modelValue.code"
          :disabled="modelValue.isLocked"
          maxlength="20"
          required
          @update:model-value="update('code', $event)" />
      </label>
      <label>
        계정과목명
        <span>*</span>
        <UiInput
          :model-value="modelValue.name"
          maxlength="100"
          required
          @update:model-value="update('name', $event)" />
      </label>
      <label>
        출력용 명칭
        <UiInput
          :model-value="modelValue.displayName"
          maxlength="100"
          @update:model-value="update('displayName', $event)" />
      </label>
      <label>
        대분류
        <UiSelect
          :model-value="modelValue.category"
          :disabled="Boolean(classifyAccount(modelValue.code)) && Number(modelValue.code) < 1000"
          :options="Object.keys(categories).map((value) => ({ value, label: value }))"
          @update:model-value="category" />
      </label>
      <label>
        중분류
        <UiSelect
          :model-value="modelValue.subcategory"
          :disabled="Boolean(classifyAccount(modelValue.code)) && Number(modelValue.code) < 1000"
          :options="
            categories[modelValue.category]?.length
              ? categories[modelValue.category]!.map((value) => ({ value, label: value }))
              : [{ value: '', label: '해당 없음' }]
          "
          @update:model-value="update('subcategory', $event)" />
      </label>
      <label>
        정상잔액
        <select
          class="input"
          :value="modelValue.balanceSide"
          @change="
            update(
              'balanceSide',
              ($event.target as HTMLSelectElement).value as MockAccount['balanceSide'],
            )
          ">
          <option value="DEBIT">차변</option>
          <option value="CREDIT">대변</option>
        </select>
      </label>
      <label class="am-checkbox">
        <input
          type="checkbox"
          :checked="modelValue.isActive"
          @change="update('isActive', ($event.target as HTMLInputElement).checked)" />
        사용
      </label>
    </div>
    <div v-show="section !== 'basic'" class="am-field-section">
      <label>
        영문명
        <UiInput
          :model-value="modelValue.englishName ?? ''"
          @update:model-value="update('englishName', $event)" />
      </label>
      <label>
        표준재무제표코드
        <UiInput
          :model-value="modelValue.statementCode ?? ''"
          :disabled="modelValue.isLocked"
          @update:model-value="update('statementCode', $event)" />
      </label>
      <label>
        세부속성
        <UiInput
          :model-value="modelValue.attribute ?? ''"
          @update:model-value="update('attribute', $event)" />
      </label>
      <label>
        관계계정
        <UiSelect
          :model-value="modelValue.relatedAccount ?? ''"
          :options="[
            { value: '', label: '없음' },
            ...accounts
              .filter((a) => a.id !== modelValue.id)
              .map((a) => ({ value: a.code, label: a.code + ' ' + a.name })),
          ]"
          @update:model-value="update('relatedAccount', $event)" />
      </label>
      <label>
        외화 처리 코드
        <UiInput
          :model-value="modelValue.fxMethodCode ?? ''"
          @update:model-value="update('fxMethodCode', $event)" />
      </label>
      <label v-if="modelValue.foreignCurrency !== undefined" class="am-checkbox">
        <input
          type="checkbox"
          :checked="modelValue.foreignCurrency"
          @change="update('foreignCurrency', ($event.target as HTMLInputElement).checked)" />
        외화여부
      </label>
      <label class="am-checkbox">
        <input
          type="checkbox"
          :checked="modelValue.businessCar"
          @change="update('businessCar', ($event.target as HTMLInputElement).checked)" />
        업무용승용차 관련
      </label>
    </div>
  </div>
</template>

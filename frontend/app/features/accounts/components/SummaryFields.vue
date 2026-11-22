<script setup lang="ts">
import { computed } from 'vue'
import { summarySide, summaryKind } from '../types'
import type { MockAccount, MockSummary } from '../types'
const props = defineProps<{
  modelValue: MockSummary
  accounts: MockAccount[]
  original?: MockSummary
}>()
const emit = defineEmits<{ 'update:modelValue': [value: MockSummary] }>()
const fixed = computed(() => props.original?.isFixed === true)
function update<K extends keyof MockSummary>(key: K, value: MockSummary[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
function element(value: string) {
  const code = value ? Number(value) : null
  emit('update:modelValue', {
    ...props.modelValue,
    transactionElementCode: code,
    side: summarySide(code, props.modelValue.name),
  })
}
const elements = [
  '자산증가',
  '부채감소',
  '자본감소',
  '비용',
  '자산감소',
  '부채증가',
  '자본증가',
  '수익',
]
</script>
<template>
  <div class="am-fields">
    <p v-if="fixed" class="am-help">
      고정적요의 명칭은 변경할 수 없습니다. 조회제외 권한은 적요구분과 별도로 적용됩니다.
    </p>
    <label>
      적요코드 *
      <UiInput
        :model-value="modelValue.code"
        maxlength="20"
        required
        @update:model-value="update('code', $event)" />
    </label>
    <label>
      적요명 *
      <UiInput
        :model-value="modelValue.name"
        :readonly="fixed"
        maxlength="150"
        required
        @update:model-value="update('name', $event)" />
    </label>
    <label>
      연결 계정과목
      <select
        class="input"
        :value="modelValue.accountId"
        @change="update('accountId', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} {{ a.name }}</option>
      </select>
    </label>
    <label>
      거래요소
      <select
        class="input"
        :value="modelValue.transactionElementCode ?? ''"
        @change="element(($event.target as HTMLSelectElement).value)">
        <option value="">미확정</option>
        <option v-for="(label, i) in elements" :key="label" :value="i + 1">
          {{ i + 1 }}. {{ label }} · {{ i < 4 ? '차변' : '대변' }}
        </option>
      </select>
    </label>
    <label>
      적요구분
      <UiInput :model-value="summaryKind(modelValue)" readonly />
    </label>
    <label class="am-checkbox">
      <input
        type="checkbox"
        :checked="modelValue.excluded"
        :disabled="!modelValue.canExclude"
        @change="update('excluded', ($event.target as HTMLInputElement).checked)" />
      고객용 목록에서 조회제외
    </label>
    <p class="am-help">
      {{
        modelValue.canExclude === undefined
          ? '서버에서 조회제외 권한을 제공하지 않아 변경할 수 없습니다.'
          : modelValue.canExclude
            ? '명칭 변경 가능여부와 별개로 고객용 목록 노출을 설정합니다.'
            : '항상 노출되는 필수 적요입니다.'
      }}
    </p>
    <label>
      안내문구
      <UiInput :model-value="modelValue.note ?? ''" @update:model-value="update('note', $event)" />
    </label>
    <label class="am-checkbox">
      <input
        type="checkbox"
        :checked="modelValue.isActive"
        @change="update('isActive', ($event.target as HTMLInputElement).checked)" />
      사용
    </label>
  </div>
</template>

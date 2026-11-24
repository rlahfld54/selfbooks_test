<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWorkspaceStore } from '~/stores/workspace'

const workspaceStore = useWorkspaceStore()

const { selectedClientName, fiscalYear } = storeToRefs(workspaceStore)

// 전기
function prevYear() {
  workspaceStore.shiftFiscalYear(-1)
}

// 차기
function nextYear() {
  workspaceStore.shiftFiscalYear(1)
}

interface Props {
  companyName?: string
  fiscalYear: number
  minYear?: number
  maxYear?: number
  showDelete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  companyName: '',
  minYear: 2024,
  maxYear: 2026,
  showDelete: true,
})

const emit = defineEmits<{
  'change-year': [year: number]
  delete: []
}>()

const dark = useState('workspace-dark', () => false)

useHead(() => ({
  htmlAttrs: {
    'data-theme': dark.value ? 'dark' : 'light',
  },
}))

const canPrev = computed(() => props.fiscalYear > props.minYear)

const canNext = computed(() => props.fiscalYear < props.maxYear)

function shiftYear(delta: number) {
  const year = props.fiscalYear + delta

  if (year < props.minYear || year > props.maxYear) return

  emit('change-year', year)
}
</script>

<template>
  <div class="common-actions" role="toolbar" aria-label="공통 액션">
    <div class="fiscal-year-controls">
      <span>{{ selectedClientName || '업체 미선택' }}</span>

      <UiButton @click="prevYear">◀ 전기</UiButton>

      <span>{{ fiscalYear }}년</span>

      <UiButton @click="nextYear">차기 ▶</UiButton>
    </div>

    <UiButton :aria-pressed="dark" @click="dark = !dark">
      {{ dark ? '☾ 다크' : '☀ 라이트' }}
    </UiButton>

    <slot name="actions" />

    <slot v-if="showDelete" name="delete">
      <UiButton @click="emit('delete')">삭제</UiButton>
    </slot>
  </div>
</template>

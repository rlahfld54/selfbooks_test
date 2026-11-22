<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MockSummary, MockAccount } from '../types'
import { sideLabel } from '../types'
const props = defineProps<{
  rows: MockSummary[]
  accounts: MockAccount[]
  selectedId?: number | null
  compact?: boolean
}>()
defineEmits<{
  select: [summary: MockSummary]
  edit: [summary: MockSummary]
  delete: [summary: MockSummary]
}>()
const columns = defineModel<string[]>('columns', { default: () => [] })
const options = [
  { key: 'category', label: '성격' },
  { key: 'subcategory', label: '중분류' },
  { key: 'attribute', label: '세부속성' },
  { key: 'relatedAccount', label: '관계계정' },
  { key: 'side', label: '차변/대변' },
]
const accountMap = computed(() => new Map(props.accounts.map((a) => [a.id, a])))
const sort = ref('code'),
  descending = ref(false)
function value(row: MockSummary, key: string): string {
  const a = accountMap.value.get(row.accountId)
  if (key === 'code' || key === 'name') return row[key]
  if (key === 'account') return a ? a.code + ' · ' + a.name : '—'
  if (key === 'side') return sideLabel(row.side)
  return String(a?.[key as keyof MockAccount] || '—')
}
function order(key: string) {
  descending.value = sort.value === key ? !descending.value : false
  sort.value = key
}
const headers = computed(() => [
  { key: 'code', label: '거래적요코드' },
  { key: 'name', label: '거래적요명' },
  { key: 'account', label: '연결 계정과목' },
  ...options.filter((o) => columns.value.includes(o.key)),
])
const sorted = computed(() =>
  [...props.rows].sort(
    (a, b) =>
      value(a, sort.value).localeCompare(value(b, sort.value), 'ko', { numeric: true }) *
      (descending.value ? -1 : 1),
  ),
)
</script>
<template>
  <div class="am-column-toolbar">
    <details class="am-column-settings">
      <summary>컬럼 설정</summary>
      <div class="am-column-menu">
        <label>
          <input type="checkbox" checked disabled />
          거래적요코드
        </label>
        <label>
          <input type="checkbox" checked disabled />
          거래적요명
        </label>
        <label>
          <input type="checkbox" checked disabled />
          연결 계정과목
        </label>
        <label>
          <input type="checkbox" checked disabled />
          계정과목코드 · 통합 컬럼에 표시
        </label>
        <label>
          <input type="checkbox" checked disabled />
          계정과목명 · 통합 컬럼에 표시
        </label>
        <label v-for="option in options" :key="option.key">
          <input v-model="columns" type="checkbox" :value="option.key" />
          {{ option.label }}
        </label>
        <UiButton size="small" @click="columns = []">기본값 복원</UiButton>
      </div>
    </details>
  </div>
  <div class="am-scroll">
    <table class="am-table am-summary-table" :class="{ compact }">
      <thead>
        <tr>
          <th
            v-for="h in headers"
            :key="h.key"
            :aria-sort="sort === h.key ? (descending ? 'descending' : 'ascending') : 'none'">
            <button @click="order(h.key)">
              {{ h.label }}{{ sort === h.key ? (descending ? ' ↓' : ' ↑') : '' }}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in sorted"
          :key="row.id"
          :class="{ selected: selectedId === row.id }"
          :aria-selected="selectedId === row.id"
          @click="$emit('select', row)"
          @dblclick="$emit('edit', row)">
          <td
            v-for="h in headers"
            :key="h.key"
            :title="value(row, h.key)"
            :class="{ 'am-code': h.key === 'code' }">
            <button v-if="h.key === 'name'" class="am-row-link" @click.stop="$emit('select', row)">
              {{ row.name }}
            </button>
            <template v-else>{{ value(row, h.key) }}</template>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="headers.length" class="am-empty">조건에 맞는 거래적요가 없습니다.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

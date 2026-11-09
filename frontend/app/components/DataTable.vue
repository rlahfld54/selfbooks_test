<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatAmount } from '~/utils/workspace'
export interface Column { key: string; label: string; width?: string; amount?: boolean; sortable?: boolean }
const props = withDefaults(defineProps<{ columns: Column[]; rows: Record<string, unknown>[]; rowKey?: string; selected?: string; density?: 'normal' | 'compact'; loading?: boolean; pageSize?: number; caption?: string }>(), { rowKey: 'id', density: 'normal', pageSize: 5, caption: '조회 결과' })
const emit = defineEmits<{ select: [row: Record<string, unknown>]; 'update:density': [value: 'normal' | 'compact'] }>()
const sortKey = ref('')
const ascending = ref(true)
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / props.pageSize)))
const sorted = computed(() => {
 const column = props.columns.find(column => column.key === sortKey.value)
 if (!column) return props.rows
 return [...props.rows].sort((a, b) => {
  const left = String(a[column.key] ?? ''), right = String(b[column.key] ?? '')
  let result: number
  if (column.amount && /^-?\d+$/.test(left) && /^-?\d+$/.test(right)) result = BigInt(left) < BigInt(right) ? -1 : BigInt(left) > BigInt(right) ? 1 : 0
  else result = left.localeCompare(right, 'ko', { numeric: true })
  return ascending.value ? result : -result
 })
})
const visibleRows = computed(() => sorted.value.slice((page.value - 1) * props.pageSize, page.value * props.pageSize))
watch(() => props.rows, () => { page.value = 1 })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
function sort(key: string) { ascending.value = sortKey.value === key ? !ascending.value : true; sortKey.value = key; page.value = 1 }
</script>
<template><div class="data-table">
 <div class="table-controls"><span>{{ rows.length }}개 항목 <span class="muted">· 읽기 전용 샘플</span></span><UiSelect aria-label="테이블 밀도" :model-value="density" :options="[{ value: 'normal', label: '기본형' }, { value: 'compact', label: '압축형' }]" @update:model-value="emit('update:density', $event as 'normal' | 'compact')" /></div>
 <LoadingState v-if="loading" /><EmptyState v-else-if="!rows.length" />
 <div v-else class="table-scroll" tabindex="0" :aria-label="caption + ' 가로 스크롤'"><table :class="density"><caption class="sr-only">{{ caption }}</caption><colgroup><col style="width: 44px" /><col v-for="column in columns" :key="column.key" :style="{ width: column.width }" /></colgroup>
 <thead><tr><th scope="col"><span class="sr-only">선택</span></th><th v-for="column in columns" :key="column.key" scope="col" :class="{ numeric: column.amount }" :aria-sort="sortKey === column.key ? ascending ? 'ascending' : 'descending' : 'none'"><button v-if="column.sortable !== false" class="sort-button" @click="sort(column.key)">{{ column.label }} <span aria-hidden="true">{{ sortKey === column.key ? ascending ? '↑' : '↓' : '↕' }}</span></button><span v-else>{{ column.label }}</span></th></tr></thead>
 <tbody><tr v-for="row in visibleRows" :key="String(row[rowKey])" :class="{ selected: selected === String(row[rowKey]) }" @click="emit('select', row)"><td><input type="radio" :aria-label="String(row.name || row[rowKey]) + ' 선택'" :checked="selected === String(row[rowKey])" @click.stop="emit('select', row)" @change="emit('select', row)" /></td><td v-for="column in columns" :key="column.key" :class="{ numeric: column.amount }"><slot :name="'cell-' + column.key" :row="row" :value="row[column.key]">{{ column.amount ? formatAmount(row[column.key]) : row[column.key] }}</slot></td></tr></tbody>
 </table></div>
 <div class="pagination"><span>{{ rows.length ? (page - 1) * pageSize + 1 : 0 }}–{{ Math.min(page * pageSize, rows.length) }} / {{ rows.length }}</span><div><UiButton aria-label="이전 페이지" :disabled="page === 1" @click="page--">‹</UiButton><span aria-live="polite">{{ page }} / {{ pageCount }}</span><UiButton aria-label="다음 페이지" :disabled="page === pageCount" @click="page++">›</UiButton></div></div>
</div></template>


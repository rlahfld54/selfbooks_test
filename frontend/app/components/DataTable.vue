<script setup lang="ts" generic="T extends object">
import { computed, reactive, ref, toRefs, watch } from 'vue'
import { formatAmount } from '~/utils/formatAmount'
import { createTableViewState, type TableViewState } from '~/types/table'
export interface Column {
  key: string; label: string; width?: string; amount?: boolean; sortable?: boolean
}
const props = withDefaults(defineProps<{
  columns: Column[]; rows: T[]; rowKey?: string; selected?: string
  density?: 'normal' | 'compact'; loading?: boolean; error?: string
  pageSize?: number; caption?: string; sample?: boolean; viewState?: TableViewState
  appearance?: 'default' | 'management'; showControls?: boolean; selectionColumn?: boolean
  configurableColumns?: boolean; emptyTitle?: string; emptyDescription?: string
}>(), {
  rowKey: 'id', density: 'normal', pageSize: 5, caption: '조회 결과', sample: true,
  appearance: 'default', showControls: true, selectionColumn: true,
  emptyTitle: '표시할 데이터가 없습니다.', emptyDescription: '검색 조건을 변경해 보세요.',
})
const emit = defineEmits<{
  select: [row: T]; 'update:density': [value: 'normal' | 'compact']; retry: []
}>()
const { sortKey, ascending, page } = toRefs(props.viewState ?? reactive(createTableViewState()))
const hidden = ref<string[]>([])
const columns = computed(() => props.columns.filter(column => !hidden.value.includes(column.key)))
const size = computed(() => Math.max(1, Math.trunc(props.pageSize) || 5))
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / size.value)))
const management = computed(() => props.appearance === 'management')
const value = (row: T, key: string): unknown => (row as Record<string, unknown>)[key]
const sorted = computed(() => {
  const column = columns.value.find(column => column.key === sortKey.value)
  if (!column || column.sortable === false) return props.rows
  return [...props.rows].sort((a, b) => {
    const left = String(value(a, column.key) ?? ''), right = String(value(b, column.key) ?? '')
    const result = column.amount && /^-?\d+$/.test(left) && /^-?\d+$/.test(right)
      ? BigInt(left) < BigInt(right) ? -1 : BigInt(left) > BigInt(right) ? 1 : 0
      : left.localeCompare(right, 'ko', { numeric: true })
    return ascending.value ? result : -result
  })
})
const visibleRows = computed(() => sorted.value.slice((page.value - 1) * size.value, page.value * size.value))
watch(() => props.rows, () => { page.value = 1 })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
watch(() => props.columns.map(column => column.key), keys => {
  hidden.value = hidden.value.filter(key => keys.includes(key))
  if (keys.length && keys.every(key => hidden.value.includes(key))) hidden.value = []
})
function sort(key: string) {
  ascending.value = sortKey.value === key ? !ascending.value : true
  sortKey.value = key
  page.value = 1
}
function toggleColumn(key: string, event: Event) {
  if ((event.target as HTMLInputElement).checked) hidden.value = hidden.value.filter(item => item !== key)
  else if (columns.value.length > 1) hidden.value = [...hidden.value, key]
}
const previous = () => { page.value = Math.max(1, page.value - 1) }
const next = () => { page.value = Math.min(pageCount.value, page.value + 1) }
</script>
<template>
  <div class="data-table" :class="{ 'data-table-management': management }">
    <div v-if="showControls || configurableColumns || $slots.toolbar" class="table-controls">
      <slot name="toolbar" />
      <template v-if="showControls">
        <span>{{ rows.length }}개 항목 <span v-if="sample" class="muted">· 읽기 전용 샘플</span></span>
        <UiSelect aria-label="테이블 밀도" :model-value="density"
          :options="[{ value: 'normal', label: '기본형' }, { value: 'compact', label: '압축형' }]"
          @update:model-value="emit('update:density', $event as 'normal' | 'compact')" />
      </template>
      <details v-if="configurableColumns" class="table-column-picker">
        <summary>표시할 열</summary>
        <div class="table-column-options">
          <label v-for="column in props.columns" :key="column.key">
            <input type="checkbox" :checked="!hidden.includes(column.key)"
              :disabled="columns.length === 1 && !hidden.includes(column.key)"
              @change="toggleColumn(column.key, $event)" />{{ column.label }}
          </label>
        </div>
      </details>
    </div>
    <template v-if="!management">
      <LoadingState v-if="loading" />
      <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />
      <EmptyState v-else-if="!rows.length" :title="emptyTitle" :description="emptyDescription" />
    </template>
    <div v-if="management || !loading && !error && rows.length" class="table-scroll" tabindex="0" :aria-label="caption + ' 가로 스크롤'">
      <table :class="[density, { 'management-table': management }]">
        <caption class="sr-only">{{ caption }}</caption>
        <colgroup>
          <col v-if="selectionColumn" class="column-width-44" />
          <col v-for="column in columns" :key="column.key" :style="{ '--column-width': column.width }" />
        </colgroup>
        <thead><tr>
          <th v-if="selectionColumn" scope="col"><span class="sr-only">선택</span></th>
          <th v-for="column in columns" :key="column.key" scope="col" :class="{ numeric: column.amount }"
            :aria-sort="sortKey === column.key ? ascending ? 'ascending' : 'descending' : 'none'">
            <button v-if="column.sortable !== false" type="button" class="sort-button" @click="sort(column.key)">
              {{ column.label }} <span aria-hidden="true">{{ sortKey === column.key ? ascending ? '↑' : '↓' : '↕' }}</span>
            </button>
            <span v-else>{{ column.label }}</span>
          </th>
        </tr></thead>
        <tbody>
          <tr v-for="row in loading || error ? [] : visibleRows" :key="String(value(row, rowKey))"
            :class="{ selected: selected === String(value(row, rowKey)) }" @click="emit('select', row)">
            <td v-if="selectionColumn">
              <input type="radio" :aria-label="String(value(row, 'name') || value(row, rowKey)) + ' 선택'"
                :checked="selected === String(value(row, rowKey))" @click.stop="emit('select', row)" />
            </td>
            <td v-for="column in columns" :key="column.key" :class="{ numeric: column.amount }">
              <slot :name="'cell-' + column.key" :row="row" :value="value(row, column.key)">{{ column.amount ? formatAmount(value(row, column.key)) : value(row, column.key) }}</slot>
            </td>
          </tr>
          <tr v-if="management && (loading || error || !rows.length)">
            <td :colspan="Math.max(1, columns.length + (selectionColumn ? 1 : 0))" class="empty">
              <LoadingState v-if="loading" />
              <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />
              <EmptyState v-else :title="emptyTitle" :description="emptyDescription" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <slot name="footer" :page="page" :page-count="pageCount" :previous="previous" :next="next">
      <div class="pagination">
        <span>{{ rows.length ? (page - 1) * size + 1 : 0 }}–{{ Math.min(page * size, rows.length) }} / {{ rows.length }}</span>
        <div>
          <UiButton aria-label="이전 페이지" :disabled="page === 1 || loading" @click="previous">‹</UiButton>
          <span aria-live="polite">{{ page }} / {{ pageCount }}</span>
          <UiButton aria-label="다음 페이지" :disabled="page === pageCount || loading" @click="next">›</UiButton>
        </div>
      </div>
    </slot>
  </div>
</template>

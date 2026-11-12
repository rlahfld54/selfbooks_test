<script setup lang="ts">
import { accounts, clients, evidenceTypes } from './mockData'
import { amount, columns, money, total, type Mode, type VoucherRow, type Column } from './model'
const props = defineProps<{ rows: VoucherRow[]; mode: Mode; selected: string; checked: string[] }>()
const emit = defineEmits<{ select: [id: string, key: string]; edit: [id: string, key: keyof VoucherRow, value: string]; check: [id: string]; add: [] }>()
const cols = computed(() => columns(props.mode))
const root = ref<HTMLElement>()
const editing = ref('')
const draft = ref('')
const error = ref('')
const cellId = (row: VoucherRow, col: Column) => `${row.id}:${col.key}`
function display(row: VoucherRow, col: Column) {
  if (col.key === 'accountName') return accounts.find(a => a.code === row.account)?.name ?? '—'
  if (col.key === 'clientName') return clients.find(a => a.code === row.client)?.name ?? '—'
  if (col.key === 'total') return money(total(row))
  if (col.amount) return money(String(row[col.key]))
  if (col.key === 'kind' && props.mode === 'sales') return row.kind === '11' ? '11 매출 과세' : '51 매입 과세'
  return row[col.key]
}
function focus(row: number, column: number) { root.value?.querySelector<HTMLElement>(`[data-cell="${row}:${column}"]`)?.focus() }
function focusKey(id: string, key: string) { const r = props.rows.findIndex(row => row.id === id); const c = cols.value.findIndex(col => col.key === key); if (r >= 0) focus(r, Math.max(0, c)) }
function finalize() {
  if (!editing.value) return true
  const row = props.rows.find(item => cols.value.some(col => cellId(item, col) === editing.value))
  const col = row && cols.value.find(item => cellId(row, item) === editing.value)
  return row && col ? commit(row, col) : true
}
defineExpose({ focusKey, finalize })
async function start(row: VoucherRow, col: Column) {
  if (editing.value === cellId(row, col)) return
  if (!finalize()) return
  if (col.readonly || window.matchMedia('(max-width: 640px)').matches) return
  editing.value = cellId(row, col); draft.value = String(row[col.key as keyof VoucherRow]); error.value = ''
  await nextTick(); root.value?.querySelector<HTMLInputElement>('input.cell-editor, select.cell-editor')?.focus()
}
function commit(row: VoucherRow, col: Column) {
  if (editing.value !== cellId(row, col)) return true
  if (col.amount && !amount(draft.value)) { error.value = '금액은 15자리 이내의 0 이상 정수로 입력하세요.'; return false }
  if (col.key === 'account' && draft.value && !accounts.some(a => a.code === draft.value)) { error.value = '목록에 있는 계정코드를 선택하세요.'; return false }
  if (col.key === 'client' && draft.value && !clients.some(a => a.code === draft.value)) { error.value = '목록에 있는 거래처코드를 선택하세요.'; return false }
  emit('edit', row.id, col.key as keyof VoucherRow, draft.value); editing.value = ''; error.value = ''; return true
}
function key(event: KeyboardEvent, r: number, c: number, row: VoucherRow, col: Column) {
  const active = editing.value === cellId(row, col)
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); editing.value = ''; error.value = ''; nextTick(() => focus(r, c)); return }
  if (!active && ['F2', ' '].includes(event.key)) { event.preventDefault(); start(row, col); return }
  const movements: Record<string, number> = { Tab: event.shiftKey ? -1 : 1, Enter: 1, ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols.value.length, ArrowUp: -cols.value.length }
  if (!(event.key in movements)) return
  if (active && event.key.startsWith('Arrow')) return
  event.preventDefault()
  if (!commit(row, col)) return
  const index = Math.max(0, Math.min(props.rows.length * cols.value.length - 1, r * cols.value.length + c + movements[event.key]!))
  nextTick(() => focus(Math.floor(index / cols.value.length), index % cols.value.length))
}
</script>
<template>
  <div ref="root" class="voucher-grid-wrap">
    <div v-if="error" role="alert" class="voucher-error">{{ error }}</div>
    <table class="voucher-grid" aria-label="전표 입력 그리드">
      <colgroup><col style="width: 36px"><col v-for="col in cols" :key="col.key" :style="{ width: col.width + 'px' }"></colgroup>
      <thead><tr><th>선택</th><th v-for="col in cols" :key="col.key" :class="{ numeric: col.amount }">{{ col.label }}</th></tr></thead>
      <tbody><tr v-for="(row, r) in rows" :key="row.id" :class="{ selected: selected === row.id }">
        <td><input type="checkbox" :aria-label="`${row.number} ${r + 1}행 선택`" :checked="checked.includes(row.id)" @change="emit('check', row.id)"></td>
        <td v-for="(col, c) in cols" :key="col.key" :data-cell="`${r}:${c}`" tabindex="0" :class="{ numeric: col.amount, readonly: col.readonly, editing: editing === cellId(row, col) }" :aria-label="`${r + 1}행 ${col.label}`" @focus="emit('select', row.id, col.key)" @click="emit('select', row.id, col.key); start(row, col)" @keydown="key($event, r, c, row, col)">
          <template v-if="editing === cellId(row, col)">
            <select v-if="col.key === 'kind' || col.key === 'evidence'" v-model="draft" class="cell-editor" :aria-label="col.label" @blur="commit(row, col)">
              <template v-if="col.key === 'kind'"><option v-for="option in mode === 'general' ? ['대체', '입금', '출금'] : ['11', '51']" :key="option" :value="option">{{ mode === 'sales' ? option === '11' ? '11 매출 과세' : '51 매입 과세' : option }}</option></template>
              <template v-else><option v-for="option in evidenceTypes" :key="option">{{ option }}</option></template>
            </select>
            <input v-else v-model="draft" class="cell-editor" :aria-label="col.label" :type="col.key === 'date' ? 'date' : 'text'" :inputmode="col.amount ? 'numeric' : undefined" :list="col.key === 'account' ? 'voucher-accounts' : col.key === 'client' ? 'voucher-clients' : undefined" @blur="commit(row, col)">
          </template>
          <template v-else>{{ display(row, col) }}</template>
        </td>
      </tr><tr v-if="!rows.length"><td :colspan="cols.length + 1" class="empty-grid">조회기간에 전표가 없습니다. 기간을 변경하거나 행을 추가하세요.</td></tr></tbody>
    </table>
    <datalist id="voucher-accounts"><option v-for="item in accounts" :key="item.code" :value="item.code">{{ item.name }}</option></datalist>
    <datalist id="voucher-clients"><option v-for="item in clients" :key="item.code" :value="item.code">{{ item.name }}</option></datalist>
  </div>
</template>

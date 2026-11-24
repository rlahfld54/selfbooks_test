<script setup lang="ts">
import { accounts, clients, evidenceTypes } from './mockData'
import {
  amount,
  columns,
  dateWithMonth,
  dateWithDay,
  sum,
  group,
  money,
  total,
  type Mode,
  type VoucherRow,
  type Column,
} from './model'
const props = defineProps<{
  rows: VoucherRow[]
  mode: Mode
  selected: string
  checked: string[]
  allChecked: boolean
  someChecked: boolean
}>()

const emit = defineEmits<{
  select: [id: string, key: string]
  edit: [id: string, key: keyof VoucherRow, value: string]
  check: [id: string]
  add: []
  'check-all': [checked: boolean]
}>()

const cols = computed(() => columns(props.mode))
function column(name: Column['key']): Column {
  return cols.value.find((col) => col.key === name)!
}
const selectedRows = computed(() => props.rows.filter((row) => props.checked.includes(row.id)))
const selectedGroup = computed(() =>
  group(
    props.rows,
    props.rows.find((row) => row.id === props.selected),
  ),
)
const root = ref<HTMLElement>()
const editing = ref('')
const draft = ref('')
const error = ref('')
const cellId = (row: VoucherRow, col: Column) => `${row.id}:${col.key}`
function focus(row: number, column: number) {
  root.value?.querySelector<HTMLElement>(`[data-cell="${row}:${column}"]`)?.focus()
}
function focusKey(id: string, key: string) {
  const r = props.rows.findIndex((row) => row.id === id)
  const c = cols.value.findIndex(
    (col) => col.key === (props.mode === 'general' && key === 'date' ? 'day' : key),
  )
  if (r >= 0) focus(r, Math.max(0, c))
}
function finalize() {
  if (!editing.value) return true
  const row = props.rows.find((item) =>
    cols.value.some((col) => cellId(item, col) === editing.value),
  )
  const col = row && cols.value.find((item) => cellId(row, item) === editing.value)
  return row && col ? commit(row, col) : true
}
defineExpose({ focusKey, finalize })
function selectAndStart(row: VoucherRow, col: Column) {
  emit('select', row.id, col.key)
  start(row, col)
}
async function start(row: VoucherRow, col: Column) {
  if (editing.value === cellId(row, col)) return
  if (!finalize()) return
  if (col.readonly || window.matchMedia('(max-width: 640px)').matches) return
  editing.value = cellId(row, col)
  draft.value =
    col.key === 'clientName'
      ? (clients.find((item) => item.code === row.client)?.name ?? '')
      : col.key === 'month'
        ? row.date.slice(5, 7)
        : col.key === 'day'
          ? row.date.slice(8, 10)
          : String(row[col.key as keyof VoucherRow] ?? '')
  error.value = ''
  await nextTick()
  root.value?.querySelector<HTMLInputElement>('input.cell-editor, select.cell-editor')?.focus()
}
function commit(row: VoucherRow, col: Column) {
  if (editing.value !== cellId(row, col)) return true
  if (col.amount && !amount(draft.value)) {
    error.value = '금액은 15자리 이내의 0 이상 정수로 입력하세요.'
    return false
  }
  if (col.key === 'account' && draft.value && !accounts.some((a) => a.code === draft.value)) {
    error.value = '목록에 있는 계정코드를 선택하세요.'
    return false
  }
  if (col.key === 'client' && draft.value && !clients.some((a) => a.code === draft.value)) {
    error.value = '목록에 있는 거래처코드를 선택하세요.'
    return false
  }
  if (col.key === 'clientName') {
    openClientSearch(row)
    return false
  }
  if (col.key === 'month') {
    const date = dateWithMonth(row.date, draft.value)
    if (!date) {
      error.value = '해당 날짜에 유효한 월을 입력하세요.'
      return false
    }
    emit('edit', row.id, 'date', date)
  } else if (col.key === 'day') {
    const date = dateWithDay(row.date, draft.value)
    if (!date) {
      error.value = '해당 월에 유효한 일을 입력하세요.'
      return false
    }
    emit('edit', row.id, 'date', date)
  } else emit('edit', row.id, col.key as keyof VoucherRow, draft.value)
  editing.value = ''
  error.value = ''
  return true
}
function key(event: KeyboardEvent, r: number, c: number, row: VoucherRow, col: Column) {
  if (event.isComposing || event.keyCode === 229) return
  const active = editing.value === cellId(row, col)
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    editing.value = ''
    error.value = ''
    nextTick(() => focus(r, c))
    return
  }
  if (
    !active &&
    event.key === 'Delete' &&
    !col.readonly &&
    !col.amount &&
    !['day', 'month', 'kind'].includes(col.key)
  ) {
    event.preventDefault()
    emit('edit', row.id, col.key as keyof VoucherRow, '')
    return
  }
  if (!active && ['F2', ' '].includes(event.key)) {
    event.preventDefault()
    start(row, col)
    return
  }
  const movements: Record<string, number> = {
    Tab: event.shiftKey ? -1 : 1,
    Enter: 1,
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: cols.value.length,
    ArrowUp: -cols.value.length,
  }
  if (!(event.key in movements)) return
  if (active && event.key.startsWith('Arrow')) return
  event.preventDefault()
  if (!commit(row, col)) return
  if (props.mode === 'general' && event.key === 'Enter') {
    if (c === cols.value.length - 1) {
      emit('add')
      return
    }
    nextTick(async () => {
      focus(r, c + 1)
      await start(row, cols.value[c + 1]!)
    })
    return
  }
  const index = Math.max(
    0,
    Math.min(
      props.rows.length * cols.value.length - 1,
      r * cols.value.length + c + movements[event.key]!,
    ),
  )
  nextTick(() => focus(Math.floor(index / cols.value.length), index % cols.value.length))
}
const searchRow = ref('')
const searchText = ref('')
const matches = computed(() =>
  clients.filter((item) =>
    (item.code + ' ' + item.name)
      .toLocaleLowerCase()
      .includes(searchText.value.trim().toLocaleLowerCase()),
  ),
)
function openClientSearch(row: VoucherRow) {
  searchText.value = draft.value
  editing.value = ''
  error.value = ''
  searchRow.value = row.id
}
async function closeClientSearch(code?: string) {
  const id = searchRow.value
  if (code) emit('edit', id, 'client', code)
  searchRow.value = ''
  await nextTick()
  await nextTick()
  focusKey(id, code ? 'memoCode' : 'clientName')
  const row = props.rows.find((item) => item.id === id)
  if (code && row) await start(row, column('memoCode'))
}
</script>
<template>
  <div ref="root" class="voucher-grid-wrap">
    <div v-if="error" role="alert" class="voucher-error">
      {{ error }}
    </div>
    <table class="voucher-grid" aria-label="전표 입력 그리드">
      <thead>
        <tr>
          <th class="voucher-select-header">
            <label class="voucher-select-all">
              <input
                type="checkbox"
                :checked="allChecked"
                :indeterminate="someChecked"
                aria-label="조회 결과 전체선택"
                @change="emit('check-all', ($event.target as HTMLInputElement).checked)" />
            </label>
          </th>

          <template v-if="mode === 'general'">
            <th>년</th>
            <th>월</th>
            <th>일</th>
            <th>구분</th>
            <th>계정코드</th>
            <th>계정과목</th>
            <th>거래처코드</th>
            <th style="min-width: 100px">거래처명</th>
            <th>적요코드</th>
            <th style="min-width: 200px">적요명</th>
            <th class="numeric">차변금액</th>
            <th class="numeric">대변금액</th>
            <th>자료수집</th>
          </template>
          <template v-else>
            <th>일자</th>
            <th>전표번호</th>
            <th>구분</th>
            <th>증빙유형</th>
            <th>거래처코드</th>
            <th>거래처명</th>
            <th class="numeric">공급가액</th>
            <th class="numeric">부가세</th>
            <th class="numeric">합계금액</th>
            <th>적요</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, r) in rows"
          :key="row.id"
          :class="{ selected: selectedGroup.some((item) => item.id === row.id) }">
          <td>
            <input
              type="checkbox"
              :aria-label="`${row.number} ${r + 1}행 선택`"
              :checked="checked.includes(row.id)"
              @change="emit('check', row.id)" />
          </td>
          <template v-if="mode === 'general'">
            <td
              :data-cell="r + ':0'"
              tabindex="0"
              class="readonly"
              :class="{ editing: editing === cellId(row, column('year')) }"
              :aria-label="r + 1 + '행 년'"
              @focus="emit('select', row.id, 'year')"
              @click="selectAndStart(row, column('year'))"
              @keydown="key($event, r, 0, row, column('year'))">
              {{ row.date.slice(0, 4) }}
            </td>
            <td
              :data-cell="r + ':1'"
              tabindex="0"
              class="readonly"
              :class="{ editing: editing === cellId(row, column('month')) }"
              :aria-label="r + 1 + '행 월'"
              @focus="emit('select', row.id, 'month')"
              @click="selectAndStart(row, column('month'))"
              @keydown="key($event, r, 1, row, column('month'))">
              <input
                v-if="editing === cellId(row, column('month'))"
                v-model="draft"
                class="cell-editor"
                aria-label="월"
                inputmode="numeric"
                @blur="commit(row, column('month'))" />
              <template v-else>{{ row.date.slice(5, 7) }}</template>
            </td>
            <td
              :data-cell="r + ':2'"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('day')) }"
              :aria-label="r + 1 + '행 일'"
              @focus="emit('select', row.id, 'day')"
              @click="selectAndStart(row, column('day'))"
              @keydown="key($event, r, 2, row, column('day'))">
              <input
                v-if="editing === cellId(row, column('day'))"
                v-model="draft"
                class="cell-editor"
                aria-label="일"
                type="text"
                inputmode="numeric"
                @blur="commit(row, column('day'))" />
              <template v-else>{{ row.date.slice(8, 10) }}</template>
            </td>
            <td
              :data-cell="r + ':3'"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('kind')) }"
              :aria-label="r + 1 + '행 구분'"
              @focus="emit('select', row.id, 'kind')"
              @click="selectAndStart(row, column('kind'))"
              @keydown="key($event, r, 3, row, column('kind'))">
              <select
                v-if="editing === cellId(row, column('kind'))"
                v-model="draft"
                class="cell-editor"
                aria-label="구분"
                @blur="commit(row, column('kind'))">
                <option>대체</option>
                <option>차변</option>
                <option>대변</option>
                <option>결차</option>
                <option>결대</option>
                <option>입금</option>
                <option>출금</option>
              </select>
              <template v-else>{{ row.kind }}</template>
            </td>
            <td
              :data-cell="r + ':4'"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('account')) }"
              :aria-label="r + 1 + '행 계정코드'"
              @focus="emit('select', row.id, 'account')"
              @click="selectAndStart(row, column('account'))"
              @keydown="key($event, r, 4, row, column('account'))">
              <input
                v-if="editing === cellId(row, column('account'))"
                v-model="draft"
                class="cell-editor"
                aria-label="계정코드"
                type="text"
                list="voucher-accounts"
                @blur="commit(row, column('account'))" />
              <template v-else>{{ row.account }}</template>
            </td>
            <td
              :data-cell="r + ':5'"
              tabindex="0"
              class="readonly"
              :class="{ editing: editing === cellId(row, column('accountName')) }"
              :aria-label="r + 1 + '행 계정과목'"
              @focus="emit('select', row.id, 'accountName')"
              @click="selectAndStart(row, column('accountName'))"
              @keydown="key($event, r, 5, row, column('accountName'))">
              {{ accounts.find((item) => item.code === row.account)?.name ?? '—' }}
            </td>
            <td
              :data-cell="r + ':6'"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('client')) }"
              :aria-label="r + 1 + '행 거래처코드'"
              @focus="emit('select', row.id, 'client')"
              @click="selectAndStart(row, column('client'))"
              @keydown="key($event, r, 6, row, column('client'))">
              <input
                v-if="editing === cellId(row, column('client'))"
                v-model="draft"
                class="cell-editor"
                aria-label="거래처코드"
                type="text"
                list="voucher-clients"
                @blur="commit(row, column('client'))" />
              <template v-else>{{ row.client }}</template>
            </td>
            <td
              :data-cell="r + ':7'"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('clientName')) }"
              :aria-label="r + 1 + '행 거래처명'"
              @focus="emit('select', row.id, 'clientName')"
              @click="selectAndStart(row, column('clientName'))"
              @keydown="key($event, r, 7, row, column('clientName'))">
              <input
                v-if="editing === cellId(row, column('clientName'))"
                v-model="draft"
                class="cell-editor"
                aria-label="거래처명"
                type="text"
                @blur="commit(row, column('clientName'))" />
              <template v-else>
                {{ clients.find((item) => item.code === row.client)?.name ?? '' }}
              </template>
            </td>
            <td
              :data-cell="r + ':8'"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('memoCode')) }"
              :aria-label="r + 1 + '행 적요코드'"
              @focus="emit('select', row.id, 'memoCode')"
              @click="selectAndStart(row, column('memoCode'))"
              @keydown="key($event, r, 8, row, column('memoCode'))">
              <input
                v-if="editing === cellId(row, column('memoCode'))"
                v-model="draft"
                class="cell-editor"
                aria-label="적요코드"
                type="text"
                @blur="commit(row, column('memoCode'))" />
              <template v-else>{{ row.memoCode ?? '' }}</template>
            </td>
            <td
              :data-cell="r + ':9'"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('memo')) }"
              :aria-label="r + 1 + '행 적요명'"
              @focus="emit('select', row.id, 'memo')"
              @click="selectAndStart(row, column('memo'))"
              @keydown="key($event, r, 9, row, column('memo'))">
              <input
                v-if="editing === cellId(row, column('memo'))"
                v-model="draft"
                class="cell-editor"
                aria-label="적요명"
                type="text"
                @blur="commit(row, column('memo'))" />
              <template v-else>{{ row.memo }}</template>
            </td>
            <td
              :data-cell="r + ':10'"
              tabindex="0"
              class="numeric"
              :class="{ editing: editing === cellId(row, column('debit')) }"
              :aria-label="r + 1 + '행 차변금액'"
              @focus="emit('select', row.id, 'debit')"
              @click="selectAndStart(row, column('debit'))"
              @keydown="key($event, r, 10, row, column('debit'))">
              <input
                v-if="editing === cellId(row, column('debit'))"
                v-model="draft"
                class="cell-editor"
                aria-label="차변금액"
                type="text"
                inputmode="numeric"
                @blur="commit(row, column('debit'))" />
              <template v-else>{{ money(row.debit) }}</template>
            </td>
            <td
              :data-cell="r + ':11'"
              tabindex="0"
              class="numeric"
              :class="{ editing: editing === cellId(row, column('credit')) }"
              :aria-label="r + 1 + '행 대변금액'"
              @focus="emit('select', row.id, 'credit')"
              @click="selectAndStart(row, column('credit'))"
              @keydown="key($event, r, 11, row, column('credit'))">
              <input
                v-if="editing === cellId(row, column('credit'))"
                v-model="draft"
                class="cell-editor"
                aria-label="대변금액"
                type="text"
                inputmode="numeric"
                @blur="commit(row, column('credit'))" />
              <template v-else>{{ money(row.credit) }}</template>
            </td>
            <td
              :data-cell="r + ':12'"
              tabindex="0"
              class="readonly"
              :class="{ editing: editing === cellId(row, column('attachment')) }"
              :aria-label="r + 1 + '행 자료수집'"
              @focus="emit('select', row.id, 'attachment')"
              @click="selectAndStart(row, column('attachment'))"
              @keydown="key($event, r, 12, row, column('attachment'))">
              {{ row.attachment ? '연결' : '미연결' }}
            </td>
          </template>
          <template v-else>
            <td
              :data-cell="`${r}:0`"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('date')) }"
              :aria-label="`${r + 1}행 일자`"
              @focus="emit('select', row.id, 'date')"
              @click="selectAndStart(row, column('date'))"
              @keydown="key($event, r, 0, row, column('date'))">
              <input
                v-if="editing === cellId(row, column('date'))"
                v-model="draft"
                class="cell-editor"
                aria-label="일자"
                type="date"
                @blur="commit(row, column('date'))" />
              <template v-else>
                {{ row.date }}
              </template>
            </td>
            <td
              :data-cell="`${r}:1`"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('number')) }"
              :aria-label="`${r + 1}행 전표번호`"
              @focus="emit('select', row.id, 'number')"
              @click="selectAndStart(row, column('number'))"
              @keydown="key($event, r, 1, row, column('number'))">
              <input
                v-if="editing === cellId(row, column('number'))"
                v-model="draft"
                class="cell-editor"
                aria-label="전표번호"
                type="text"
                @blur="commit(row, column('number'))" />
              <template v-else>
                {{ row.number }}
              </template>
            </td>
            <td
              :data-cell="`${r}:2`"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('kind')) }"
              :aria-label="`${r + 1}행 구분`"
              @focus="emit('select', row.id, 'kind')"
              @click="selectAndStart(row, column('kind'))"
              @keydown="key($event, r, 2, row, column('kind'))">
              <select
                v-if="editing === cellId(row, column('kind'))"
                v-model="draft"
                class="cell-editor"
                aria-label="구분"
                @blur="commit(row, column('kind'))">
                <option value="11">11 매출 과세</option>
                <option value="51">51 매입 과세</option>
              </select>
              <template v-else>
                {{ row.kind === '11' ? '11 매출 과세' : '51 매입 과세' }}
              </template>
            </td>
            <td
              :data-cell="`${r}:3`"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('evidence')) }"
              :aria-label="`${r + 1}행 증빙유형`"
              @focus="emit('select', row.id, 'evidence')"
              @click="selectAndStart(row, column('evidence'))"
              @keydown="key($event, r, 3, row, column('evidence'))">
              <select
                v-if="editing === cellId(row, column('evidence'))"
                v-model="draft"
                class="cell-editor"
                aria-label="증빙유형"
                @blur="commit(row, column('evidence'))">
                <option v-for="option in evidenceTypes" :key="option">{{ option }}</option>
              </select>
              <template v-else>
                {{ row.evidence }}
              </template>
            </td>
            <td
              :data-cell="`${r}:4`"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('client')) }"
              :aria-label="`${r + 1}행 거래처코드`"
              @focus="emit('select', row.id, 'client')"
              @click="selectAndStart(row, column('client'))"
              @keydown="key($event, r, 4, row, column('client'))">
              <input
                v-if="editing === cellId(row, column('client'))"
                v-model="draft"
                class="cell-editor"
                aria-label="거래처코드"
                type="text"
                list="voucher-clients"
                @blur="commit(row, column('client'))" />
              <template v-else>
                {{ row.client }}
              </template>
            </td>
            <td
              :data-cell="`${r}:5`"
              tabindex="0"
              class="readonly"
              :aria-label="`${r + 1}행 거래처명`"
              @focus="emit('select', row.id, 'clientName')"
              @click="selectAndStart(row, column('clientName'))"
              @keydown="key($event, r, 5, row, column('clientName'))">
              {{ clients.find((c) => c.code === row.client)?.name ?? '—' }}
            </td>
            <td
              :data-cell="`${r}:6`"
              tabindex="0"
              class="numeric"
              :class="{ editing: editing === cellId(row, column('supply')) }"
              :aria-label="`${r + 1}행 공급가액`"
              @focus="emit('select', row.id, 'supply')"
              @click="selectAndStart(row, column('supply'))"
              @keydown="key($event, r, 6, row, column('supply'))">
              <input
                v-if="editing === cellId(row, column('supply'))"
                v-model="draft"
                class="cell-editor"
                aria-label="공급가액"
                type="text"
                inputmode="numeric"
                @blur="commit(row, column('supply'))" />
              <template v-else>
                {{ money(row.supply) }}
              </template>
            </td>
            <td
              :data-cell="`${r}:7`"
              tabindex="0"
              class="numeric"
              :class="{ editing: editing === cellId(row, column('vat')) }"
              :aria-label="`${r + 1}행 부가세`"
              @focus="emit('select', row.id, 'vat')"
              @click="selectAndStart(row, column('vat'))"
              @keydown="key($event, r, 7, row, column('vat'))">
              <input
                v-if="editing === cellId(row, column('vat'))"
                v-model="draft"
                class="cell-editor"
                aria-label="부가세"
                type="text"
                inputmode="numeric"
                @blur="commit(row, column('vat'))" />
              <template v-else>
                {{ money(row.vat) }}
              </template>
            </td>
            <td
              :data-cell="`${r}:8`"
              tabindex="0"
              class="numeric readonly"
              :aria-label="`${r + 1}행 합계금액`"
              @focus="emit('select', row.id, 'total')"
              @click="selectAndStart(row, column('total'))"
              @keydown="key($event, r, 8, row, column('total'))">
              {{ money(total(row)) }}
            </td>
            <td
              :data-cell="`${r}:9`"
              tabindex="0"
              :class="{ editing: editing === cellId(row, column('memo')) }"
              :aria-label="`${r + 1}행 적요`"
              @focus="emit('select', row.id, 'memo')"
              @click="selectAndStart(row, column('memo'))"
              @keydown="key($event, r, 9, row, column('memo'))">
              <input
                v-if="editing === cellId(row, column('memo'))"
                v-model="draft"
                class="cell-editor"
                aria-label="적요"
                type="text"
                @blur="commit(row, column('memo'))" />
              <template v-else>
                {{ row.memo }}
              </template>
            </td>
          </template>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="cols.length + 1" class="empty-grid">
            조회기간에 전표가 없습니다. 기간을 변경하거나 행을 추가하세요.
          </td>
        </tr>
      </tbody>
      <tfoot v-if="mode === 'general'">
        <tr>
          <td colspan="11">
            선택합계 · {{ new Set(selectedRows.map((row) => row.date + ':' + row.number)).size }}건
          </td>
          <td class="numeric">{{ money(sum(selectedRows, 'debit').toString()) }}</td>
          <td class="numeric">{{ money(sum(selectedRows, 'credit').toString()) }}</td>
          <td></td>
        </tr>
        <tr>
          <td colspan="11">합계</td>
          <td class="numeric">{{ money(sum(rows, 'debit').toString()) }}</td>
          <td class="numeric">{{ money(sum(rows, 'credit').toString()) }}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <UiModal :open="!!searchRow" title="거래처 검색" size="search" @close="closeClientSearch()">
      <label>
        거래처명 또는 코드
        <input
          v-model="searchText"
          data-autofocus
          aria-label="거래처 검색어"
          @keydown.enter.prevent="
            !$event.isComposing && matches.length === 1 && closeClientSearch(matches[0]!.code)
          " />
      </label>
      <p v-if="!matches.length" role="status">검색 결과가 없습니다. 검색어를 변경하세요.</p>
      <ul>
        <li v-for="item in matches" :key="item.code">
          <UiButton @click="closeClientSearch(item.code)">
            {{ item.code }} · {{ item.name }}
          </UiButton>
        </li>
      </ul>
    </UiModal>
    <datalist id="voucher-accounts">
      <option v-for="item in accounts" :key="item.code" :value="item.code">
        {{ item.name }}
      </option>
    </datalist>
    <datalist id="voucher-clients">
      <option v-for="item in clients" :key="item.code" :value="item.code">
        {{ item.name }}
      </option>
    </datalist>
  </div>
</template>
<style scoped>
.voucher-grid th {
  text-align: center;
}
</style>

<script setup lang="ts">
import WorkspaceVoucherNavigation from '~/features/workspace/components/WorkspaceVoucherNavigation.vue'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { voucherSession } from './session'
import { blankRow, saveMockRows } from './mockData'
import { group, type Mode, type VoucherRow } from './model'
import VoucherGrid from './VoucherGrid.vue'
import VoucherDetail from './VoucherDetail.vue'

type QueryMode = 'period' | 'month'
type SourceTab = 'all' | 'electronic' | 'nonElectronic' | 'manual'

// 실제 VoucherRow 모델과 연결할 때 변경할 자료 출처 타입
type VoucherSource = 'nts-electronic' | 'paper' | 'manual'

const props = defineProps<{ mode: Mode }>()
const { activeTab, company, user, setDirty, density } = useWorkspaceContext()

const tab = activeTab.value
const session = voucherSession(tab)
const grid = ref<InstanceType<typeof VoucherGrid>>()

const notice = ref('')
const deleting = ref(false)
const search = ref('')
const sort = ref('input')

// 날짜 유틸
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthRange(value: string) {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) {
    return { from: '', to: '' }
  }

  return {
    from: `${value}-01`,
    to: formatLocalDate(new Date(year, month, 0)),
  }
}

const today = new Date()
const currentDate = formatLocalDate(today)
const currentMonth = currentDate.slice(0, 7)

// 조회 조건
const queryMode = ref<QueryMode>('period')
const month = ref(currentMonth)
const sourceTab = ref<SourceTab>('all')

// 실제 조회에 적용된 조건
const appliedQuery = ref({
  from: session.from,
  to: session.to,
  source: 'all' as SourceTab,
})

// 최초 기본 조회기간 (기존 값이 없을 때만 설정)
if (!session.from && !session.to) {
  session.from = `${currentMonth}-01`
  session.to = currentDate
}

// 기간/월별 전환
function changeQueryMode(mode: QueryMode) {
  if (queryMode.value === mode) return

  queryMode.value = mode

  if (mode === 'month') {
    month.value = currentMonth
    const range = getMonthRange(month.value)
    session.from = range.from
    session.to = range.to
  } else {
    session.from = `${currentMonth}-01`
    session.to = currentDate
  }
}

// 월별 연월 변경 시 날짜 동기화
watch(month, (value) => {
  if (queryMode.value !== 'month') return

  const range = getMonthRange(value)
  session.from = range.from
  session.to = range.to
})

// 조회 버튼
function applySearch() {
  const range =
    queryMode.value === 'month'
      ? getMonthRange(month.value)
      : { from: session.from, to: session.to }

  if (!range.from || !range.to) {
    notice.value = '조회기간을 입력해주세요.'
    return
  }

  if (range.from > range.to) {
    notice.value = '시작일이 종료일보다 늦을 수 없습니다.'
    return
  }

  session.from = range.from
  session.to = range.to

  appliedQuery.value = {
    ...range,
    source: sourceTab.value,
  }

  session.checked = []
  notice.value = ''
}

// 자료 출처 구분
// TODO: model.ts의 실제 필드에 맞게 연결
function getVoucherSource(row: VoucherRow): VoucherSource | null {
  const source = (row as VoucherRow & { sourceType?: VoucherSource }).sourceType

  if (source === 'nts-electronic' || source === 'paper' || source === 'manual') {
    return source
  }

  return null
}

function matchesSource(row: VoucherRow, source: SourceTab) {
  if (source === 'all') return true

  const rowSource = getVoucherSource(row)

  if (source === 'electronic') {
    return rowSource === 'nts-electronic'
  }

  if (source === 'nonElectronic') {
    return rowSource === 'paper'
  }

  return rowSource === 'manual'
}

// 기존 전표 단위 선택 유지
function getGroupIds(id: string): string[] {
  const row = session.rows.find((item) => item.id === id)
  if (!row) return []

  return props.mode === 'general' ? group(session.rows, row).map((item) => item.id) : [id]
}

function checkGroup(id: string) {
  const ids = getGroupIds(id)
  if (!ids.length) return

  const checked = new Set(session.checked)
  const allChecked = ids.every((value) => checked.has(value))

  ids.forEach((value) => {
    if (allChecked) checked.delete(value)
    else checked.add(value)
  })

  session.checked = [...checked]
}

// 조회 결과
const filtered = computed(() =>
  session.rows
    .filter((row) => {
      const { from, to, source } = appliedQuery.value

      const matchesDate = (!from || row.date >= from) && (!to || row.date <= to)

      const matchesText = (row.memo + row.number + row.account + row.client).includes(search.value)

      return matchesDate && matchesText && matchesSource(row, source)
    })
    .sort((a, b) => (sort.value === 'date' ? a.date.localeCompare(b.date) : 0)),
)

// 화면에 조회된 행의 전체선택/해제
const visibleIds = computed(() => [
  ...new Set(filtered.value.flatMap((row) => getGroupIds(row.id))),
])

const allChecked = computed(
  () => visibleIds.value.length > 0 && visibleIds.value.every((id) => session.checked.includes(id)),
)

const someChecked = computed(
  () => !allChecked.value && visibleIds.value.some((id) => session.checked.includes(id)),
)

function toggleAllChecked(checked: boolean) {
  const selected = new Set(session.checked)

  visibleIds.value.forEach((id) => {
    if (checked) selected.add(id)
    else selected.delete(id)
  })

  session.checked = [...selected]
}

const selected = computed(() => session.rows.find((row) => row.id === session.selected))

// 기존 UI 환경설정 유지
const preferencesReady = ref(false)
const preferenceKey = `accounting-pro:vouchers:${user}:${props.mode}`

onMounted(() => {
  if (!session.initialized) {
    tab.panelWidth = Math.max(300, Math.min(480, Math.round((window.innerWidth - 220) * 0.24)))
    tab.panel = window.innerWidth > 1280

    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}')

      if (typeof saved.width === 'number' && Number.isFinite(saved.width)) {
        tab.panelWidth = Math.min(480, Math.max(300, saved.width))
      }

      if (typeof saved.open === 'boolean' && window.innerWidth > 1280) {
        tab.panel = saved.open
      }

      if (typeof saved.detail === 'boolean') {
        session.detail = saved.detail
      }

      if (typeof saved.pinned === 'boolean') {
        session.pinned = saved.pinned
      }
    } catch {
      // 환경설정이 없으면 기본값 사용
    }

    session.initialized = true
  }

  preferencesReady.value = true
})

watch(
  () => [tab.panelWidth, tab.panel, session.detail, session.pinned],
  () => {
    if (!preferencesReady.value) return

    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify({
          width: tab.panelWidth,
          open: tab.panel,
          detail: session.detail,
          pinned: session.pinned,
        }),
      )
    } catch {
      notice.value = 'UI 설정을 저장할 수 없어 이번 탭에서만 유지됩니다.'
    }
  },
)

// 기존 편집 기능
function edit(id: string, key: keyof VoucherRow, value: string) {
  const row = session.rows.find((row) => row.id === id)

  if (row && row[key] !== value) {
    Object.assign(row, { [key]: value })
    setDirty(tab)
    notice.value = ''
  }
}

function select(id: string, key: string) {
  session.selected = id

  if (!session.pinned) {
    if (key.startsWith('client')) {
      session.insight = '거래처 정보'
    }
    if (key === 'evidence') {
      session.insight = '증빙자료'
    }
  }
}

function add() {
  if (!grid.value?.finalize()) return

  const number = String(
    Math.max(0, ...session.rows.map((row) => Number(row.number) || 0)) + 1,
  ).padStart(5, '0')

  const row = blankRow(
    crypto.randomUUID(),
    session.from || session.to || formatLocalDate(new Date()),
    number,
  )

  if (props.mode === 'sales') row.kind = '51'

  session.rows.push(row)
  session.selected = row.id
  setDirty(tab)

  nextTick(() => grid.value?.focusKey(row.id, 'date'))
}

function remove() {
  const removed = new Set(session.checked.flatMap((id) => getGroupIds(id)))

  session.rows = session.rows.filter((row) => !removed.has(row.id))

  if (!session.rows.some((row) => row.id === session.selected)) {
    session.selected = ''
  }

  session.checked = []
  deleting.value = false
  setDirty(tab)
}

function save() {
  if (!grid.value?.finalize()) return

  session.rows = saveMockRows(session.rows)
  setDirty(tab, false)

  notice.value = 'Mock 저장 완료 · 현재 탭 메모리에만 보관됩니다.'
}

// 외부 포커스 요청 처리
watch(
  () => session.focusRequest,
  () => {
    if (selected.value) {
      // 선택된 전표를 조회기간과 관계없이 표시
      session.from = ''
      session.to = ''

      appliedQuery.value = {
        from: '',
        to: '',
        source: 'all',
      }
      sourceTab.value = 'all'
      search.value = ''

      nextTick(() => grid.value?.focusKey(session.selected, session.focusKey))
    }
  },
)
</script>

<template>
  <div class="voucher-screen" :class="{ 'voucher-compact': density === 'compact' }">
    <PageToolbar>
      <template #delete>
        <UiButton :disabled="!session.checked.length" @click="deleting = true">삭제</UiButton>
      </template>

      <template #last>
        <details class="toolbar-more">
          <summary>더보기</summary>
          <div>
            <UiButton @click="session.detail = !session.detail">
              분개 상세 {{ session.detail ? '접기' : '펼치기' }}
            </UiButton>
          </div>
        </details>
      </template>
    </PageToolbar>

    <!-- 조회 조건 -->
    <div class="voucher-query-toolbar">
      <!-- 기간 / 월별 -->
      <div class="voucher-query-tabs">
        <button
          type="button"
          :class="{ active: queryMode === 'period' }"
          @click="changeQueryMode('period')">
          기간
        </button>
        <button
          type="button"
          :class="{ active: queryMode === 'month' }"
          @click="changeQueryMode('month')">
          월별
        </button>
      </div>

      <!-- 조회기간 -->
      <div class="voucher-query-dates">
        <template v-if="queryMode === 'period'">
          <input v-model="session.from" type="date" aria-label="조회 시작일" />
          <span>~</span>
          <input v-model="session.to" type="date" aria-label="조회 종료일" />
        </template>

        <template v-else>
          <input v-model="month" type="month" aria-label="조회 연월" />
          <span class="voucher-month-range">{{ session.from }} ~ {{ session.to }}</span>
        </template>
      </div>

      <UiButton @click="applySearch">조회</UiButton>
    </div>

    <!-- 자료 구분 -->
    <div class="voucher-source-toolbar">
      <div class="voucher-source-tabs">
        <button
          v-for="item in [
            { value: 'all', label: '전체' },
            { value: 'electronic', label: '전자' },
            { value: 'nonElectronic', label: '비전자' },
            { value: 'manual', label: '수기입력' },
          ]"
          :key="item.value"
          type="button"
          :class="{ active: sourceTab === item.value }"
          @click="sourceTab = item.value as SourceTab">
          {{ item.label }}
        </button>
      </div>

      <span class="voucher-row-count">조회 {{ filtered.length }}행</span>
    </div>

    <p v-if="notice" role="status" class="good">
      {{ notice }}
    </p>

    <!-- 전표 테이블 -->
    <VoucherGrid
      ref="grid"
      :rows="filtered"
      :mode="mode"
      :selected="session.selected"
      :checked="session.checked"
      :all-checked="allChecked"
      :some-checked="someChecked"
      @edit="edit"
      @add="add"
      @select="select"
      @check="checkGroup"
      @check-all="toggleAllChecked" />

    <!-- 상세 영역 -->
    <div class="voucher-section-title">
      <strong>선택 전표 {{ selected?.number || '—' }} · {{ filtered.length }}행</strong>

      <UiButton @click="session.detail = !session.detail">
        {{ session.detail ? '분개 상세 접기' : '분개 상세 펼치기' }}
      </UiButton>
    </div>

    <VoucherDetail v-if="session.detail" :rows="group(session.rows, selected)" :mode="mode" />

    <p class="muted">
      가상 거래 · 저장·수정·삭제는 탭 메모리에서만 처리합니다. 새로고침하면 초기화됩니다. 검증은
      화면 확인용이며 회계·세법 검증이 아닙니다.
    </p>

    <ConfirmDialog
      :open="deleting"
      title="선택 행 삭제 확인"
      :message="`선택한 ${session.checked.length}행을 삭제할까요? 같은 날짜·번호의 분개 전체를 함께 삭제합니다.`"
      confirm-label="삭제 확인"
      @cancel="deleting = false"
      @confirm="remove" />
  </div>
</template>
<style scoped>
/* ==========================================
   Voucher Screen
   일반전표 / 매입매출전표 공통
========================================== */

.voucher-screen {
  --voucher-primary: #2457c5;
  --voucher-primary-hover: #1d46a3;
  --voucher-primary-light: #eaf1ff;
  --voucher-border: #e2e8f0;
  --voucher-text: #334155;
  --voucher-muted: #64748b;
  --voucher-bg: #ffffff;
  --voucher-hover: #f8fafc;

  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  color: var(--voucher-text);
  font-size: 13px;
}

/* 조회 조건 */

.voucher-screen .voucher-query-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 52px;
  padding: 9px 14px;
  background: var(--voucher-bg);
  border: 1px solid var(--voucher-border);
  border-radius: 8px;
}

/* 기간 / 월별 탭 */

.voucher-screen .voucher-query-tabs {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 3px;
  gap: 2px;
  background: #f1f5f9;
  border-radius: 6px;
}

.voucher-screen .voucher-query-tabs button {
  min-width: 52px;
  height: 29px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--voucher-muted);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.voucher-screen .voucher-query-tabs button:hover {
  color: var(--voucher-primary);
}

.voucher-screen .voucher-query-tabs button.active {
  background: #fff;
  color: var(--voucher-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgb(15 23 42 / 10%);
}

/* 날짜 선택 */

.voucher-screen .voucher-query-dates {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.voucher-screen .voucher-query-dates input {
  width: 145px;
  min-width: 0;
  height: 34px;
  padding: 0 9px;
  border: 1px solid var(--voucher-border);
  border-radius: 5px;
  background: #fff;
  color: var(--voucher-text);
  font: inherit;
  color-scheme: light;
}

.voucher-screen .voucher-query-dates input[type='month'] {
  width: 155px;
}

.voucher-screen .voucher-query-dates input:hover {
  border-color: #94a3b8;
}

.voucher-screen .voucher-query-dates input:focus {
  border-color: var(--voucher-primary);
  outline: 2px solid rgb(36 87 197 / 12%);
  outline-offset: 0;
}

.voucher-screen .voucher-query-dates > span:not(.voucher-month-range) {
  color: #94a3b8;
}

.voucher-screen .voucher-month-range {
  color: var(--voucher-muted);
  font-size: 12px;
  white-space: nowrap;
}

/* 자료 구분 */

.voucher-screen .voucher-source-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 42px;
  padding: 0 4px;
  border-bottom: 1px solid var(--voucher-border);
}

.voucher-screen .voucher-source-tabs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.voucher-screen .voucher-source-tabs button {
  position: relative;
  min-height: 40px;
  padding: 0 15px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--voucher-muted);
  font: inherit;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.voucher-screen .voucher-source-tabs button:hover {
  background: var(--voucher-hover);
  color: var(--voucher-primary);
}

.voucher-screen .voucher-source-tabs button.active {
  color: var(--voucher-primary);
  border-bottom-color: var(--voucher-primary);
  font-weight: 600;
}

.voucher-screen .voucher-row-count {
  margin-left: auto;
  color: var(--voucher-muted);
  font-size: 12px;
  white-space: nowrap;
}

/* 전표 상세 영역 헤더 */

.voucher-screen .voucher-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 42px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid var(--voucher-border);
  border-radius: 6px;
}

.voucher-screen .voucher-section-title strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
}

/* 안내 메시지 */

.voucher-screen p.good {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 12px;
}

.voucher-screen p.muted {
  margin: 0;
  padding: 4px 2px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.6;
}

/* 더보기 드롭다운 */

.voucher-screen .toolbar-more {
  position: relative;
}

.voucher-screen .toolbar-more summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--voucher-border);
  border-radius: 5px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  list-style: none;
}

.voucher-screen .toolbar-more summary::-webkit-details-marker {
  display: none;
}

.voucher-screen .toolbar-more summary:hover {
  background: var(--voucher-hover);
}

.voucher-screen .toolbar-more[open] > div {
  position: absolute;
  z-index: 30;
  top: calc(100% + 5px);
  right: 0;
  min-width: 160px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--voucher-border);
  border-radius: 7px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 12%);
}

/* 압축 모드 */

.voucher-screen.voucher-compact {
  gap: 8px;
  font-size: 12px;
}

.voucher-compact .voucher-query-toolbar {
  min-height: 42px;
  padding: 5px 10px;
  gap: 8px;
}

.voucher-compact .voucher-query-dates input {
  height: 29px;
}

.voucher-compact .voucher-query-tabs button {
  height: 25px;
  min-width: 46px;
  padding: 0 9px;
}

.voucher-compact .voucher-source-tabs button {
  min-height: 33px;
  padding: 0 11px;
}

.voucher-compact .voucher-section-title {
  min-height: 35px;
  padding: 5px 10px;
}

/* 반응형 */

@media (max-width: 768px) {
  .voucher-screen .voucher-query-toolbar {
    align-items: flex-start;
    gap: 10px;
  }

  .voucher-screen .voucher-query-dates {
    flex: 1 1 100%;
  }

  .voucher-screen .voucher-source-toolbar {
    align-items: flex-start;
  }

  .voucher-screen .voucher-source-tabs {
    max-width: 100%;
  }

  .voucher-screen .voucher-source-tabs button {
    padding: 0 10px;
  }

  .voucher-screen .voucher-section-title {
    align-items: center;
  }
}
</style>

<script setup lang="ts">
import VoucherSearchModal from './VoucherSearchModal.vue'
import { advancedSearch, type AdvancedFilter } from './services/voucherSearch'
import VoucherEditorTools from './VoucherEditorTools.vue'
import VoucherOperations from './VoucherOperations.vue'
import SalesVoucherBoard from './SalesVoucherBoard.vue'
import WorkspaceVoucherNavigation from '~/features/workspace/components/WorkspaceVoucherNavigation.vue'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
const { density } = useWorkspaceContext()
const detailOpen = ref(false)
// 상세 편집은 접어 두고, 상단 그리드 · 상시 입력행으로 입력한다(팀장님 화면 구성)
const journalOpen = ref(false)
import { formatAmount } from '~/utils/formatAmount'
import { payments, sumAmounts, transactionTypes } from './services/salesJournal'
import SalesAmountInput from './SalesAmountInput.vue'
import { useSalesJournal } from './composables/useSalesJournal'
const salesJournal = useSalesJournal()
const {
  pagesPreview,
  tab,
  session,
  meta,
  busy,
  loading,
  error,
  notice,
  filterError,
  searchOpen,
  deleting,
  pending,
  partners,
  partnerName,
  periodOptions,
  accountOptions,
  currentPeriod,
  locked,
  rows,
  draftTotal,
  debit,
  credit,
  edit,
  taxEdit,
  protect,
  reset,
  select,
  load,
  queryRecords,
  filterType,
  partnerSelected,
  save,
  remove,
} = salesJournal

const editorTools = ref<InstanceType<typeof VoucherEditorTools>>()
const board = ref<InstanceType<typeof SalesVoucherBoard>>()
const selectedIds = ref<string[]>([]),
  pinned = ref(false)
const checkedRows = computed(() => session.rows.filter((row) => selectedIds.value.includes(row.id)))
const advancedOpen = ref(false),
  advanced = ref<AdvancedFilter>({})
const visibleRows = computed(
  () => board.value?.visibleRows ?? advancedSearch(rows.value, advanced.value),
)
const availableTypes = computed(
  () =>
    meta.value?.vatTypes
      ?.filter((t) => t.enabled)
      .map((t) => ({
        value: t.code,
        label: t.code + ' · ' + (t.direction === 'sales' ? '매출 ' : '매입 ') + t.name,
      })) ?? transactionTypes,
)
function focusSearch() {
  advancedOpen.value = true
}
const accountIndex = ref<number | null>(null)
const accountSearchItems = computed(() =>
  (meta.value?.accounts ?? []).map((row) => ({
    ...row,
    contact: '',
    status: '',
    amount: '',
    date: '',
  })),
)
function chooseAccount(row: { id: string }) {
  if (accountIndex.value !== null && session.draft.lines[accountIndex.value]) {
    session.draft.lines[accountIndex.value]!.account = row.id
    edit()
  }
  accountIndex.value = null
}
const selectedRecord = computed(() => session.rows.find((row) => row.id === session.selected))

function addLine() {
  session.draft.lines.push({ side: 'debit', account: '', amount: '', memo: '' })
  edit()
}
function removeLine(index: number) {
  session.draft.lines.splice(index, 1)
  edit()
}
function confirmPending() {
  pending.value?.()
  pending.value = null
}
</script>

<template>
  <div class="sales-journal voucher-screen" :class="{ 'voucher-compact': density === 'compact' }">
    <PageToolbar>
    <UiBadge tone="neutral">
      {{ pagesPreview ? '미리보기' : (meta?.company ?? '연결 대기') }}
    </UiBadge>
    <template #delete>
      <UiButton
        :disabled="pagesPreview || !session.selected || busy || loading || locked"
        @click="deleting = true">
        삭제
      </UiButton>
    </template>
    <UiButton
      :aria-expanded="detailOpen"
      aria-controls="sales-detail"
      @click="detailOpen = !detailOpen">
      {{ detailOpen ? '인사이트 닫기' : '인사이트 열기' }}
    </UiButton>
    <UiButton
      variant="primary"
      :disabled="pagesPreview || busy || loading || !meta || locked"
      @click="save">
      {{ busy ? '저장 중…' : '전표 저장' }}
    </UiButton>
    </PageToolbar>
    <WorkspaceVoucherNavigation />
    <p v-if="pinned" role="status">하단 전표 고정 중 — 고정 전환 버튼으로 해제할 수 있습니다.</p>
    <div class="context-notice">
      <UiIcon name="document" :size="17" />
      <span v-if="pagesPreview">
        공개 미리보기입니다. 샘플 전표를 조회하고 입력 화면을 체험할 수 있습니다. 저장과 삭제는
        비활성화되어 있습니다.
      </span>
      <span v-else>
        실제 저장 회사: {{ meta?.company ?? '연결 중' }} · 본점. 상단 샘플 회사 선택과 별개로
        서버에서 고정된 회사에 저장합니다. 저장 전 입력만 탭 안에서 유지됩니다.
      </span>
    </div>
    <div v-if="error" class="error-notice" role="alert">
      {{ error }}
      <UiButton :disabled="loading || busy" @click="load">다시 조회</UiButton>
    </div>
    <p v-if="loading" role="status">전표와 기초정보를 불러오는 중입니다…</p>
    <p v-if="notice" class="result-notice" role="status">{{ notice }}</p>
    <div
      class="sales-layout"
      :class="{ 'sales-layout-wide': !detailOpen }"
      :inert="busy || loading">
      <div class="sales-main">
        <SalesVoucherBoard
          ref="board"
          v-model:checked="selectedIds"
          v-model:density="density"
          :journal="salesJournal"
          :pinned="pinned"
          :advanced="advanced"
          @search="focusSearch"
          @editor="journalOpen = true">
          <template #more>
            <VoucherOperations
              :rows="visibleRows"
              :all-rows="session.rows"
              :selected="checkedRows.length ? checkedRows : selectedRecord ? [selectedRecord] : []"
              :meta="meta"
              :dirty="tab.dirty"
              :preview="!!pagesPreview"
              @refresh="load"
              @filter="(type) => filterType(type)"
              @pin="pinned = !pinned"
              @items="editorTools?.openItems()"
              @search="focusSearch"
              @preferences="() => {}" />
            <div class="board-actions">
              <UiButton :disabled="busy || loading || !meta" @click="protect(reset)">
                + 신규 전표 (상세 입력)
              </UiButton>
            </div>
          </template>
        </SalesVoucherBoard>

        <div class="voucher-section-title">
          <strong>분개 상세 · {{ selectedRecord?.entryNumber ?? '신규 전표' }}</strong>
          <UiBadge v-if="tab.dirty" tone="warning">미저장 변경</UiBadge>
          <UiButton
            :aria-expanded="journalOpen"
            aria-controls="sales-journal-editor"
            @click="journalOpen = !journalOpen">
            {{ journalOpen ? '분개 상세 접기' : '분개 상세 펼치기' }}
          </UiButton>
        </div>
        <section
          v-show="journalOpen"
          id="sales-journal-editor"
          class="sales-card editor"
          aria-labelledby="sales-editor-heading">
          <div class="section-heading">
            <h2 id="sales-editor-heading">
              {{ session.selected ? '전표 수정' : '신규 전표 입력' }}
            </h2>
            <UiBadge :tone="tab.dirty ? 'warning' : 'neutral'">
              {{
                tab.dirty
                  ? '미저장 변경'
                  : locked
                    ? '수정 불가'
                    : session.selected
                      ? '미확정 전표'
                      : '입력 대기'
              }}
            </UiBadge>
          </div>
          <details class="sales-more calculation-tools">
            <summary>
              계산 및 자동분개
              <span>수량·단가 계산 · 복수거래 · 입력 환경설정</span>
            </summary>
            <VoucherEditorTools
              v-if="meta"
              ref="editorTools"
              :draft="session.draft"
              :meta="meta"
              :locked="locked"
              @edit="edit"
              @tax-edit="taxEdit"
              @refresh="load" />
          </details>
          <form @submit.prevent="save" @input="edit" @change="edit">
            <fieldset :disabled="locked || !meta" class="entry-fields">
              <div class="sales-form">
                <label class="wide">
                  회계기간
                  <UiSelect
                    aria-label="회계기간"
                    v-model="session.draft.periodId"
                    :options="periodOptions" />
                </label>
                <label>
                  전표일자
                  <input
                    v-model="session.draft.date"
                    type="date"
                    class="input"
                    :min="currentPeriod?.start"
                    :max="currentPeriod?.end" />
                </label>
                <label>
                  거래유형
                  <UiSelect
                    aria-label="거래유형"
                    v-model="session.draft.type"
                    :options="availableTypes"
                    @update:model-value="taxEdit" />
                </label>
                <label class="wide">
                  거래처
                  <span class="partner-input">
                    <UiInput
                      :model-value="partnerName"
                      readonly
                      placeholder="F2 또는 검색으로 거래처 선택"
                      @keydown.f2.prevent="searchOpen = true" />
                    <UiButton type="button" aria-label="거래처 검색" @click="searchOpen = true">
                      <UiIcon name="search" :size="16" />
                    </UiButton>
                  </span>
                </label>
                <label>
                  품명
                  <UiInput
                    v-model="session.draft.item"
                    placeholder="품명 또는 거래 내용"
                    maxlength="200" />
                </label>
                <label>
                  결제방법
                  <UiSelect
                    aria-label="결제방법"
                    v-model="session.draft.payment"
                    :options="payments" />
                </label>
                <label>
                  공급가액
                  <SalesAmountInput
                    v-model="session.draft.supply"
                    placeholder="0"
                    @update:model-value="taxEdit" />
                </label>
                <label>
                  부가세
                  <SalesAmountInput
                    v-model="session.draft.vat"
                    placeholder="수기 입력"
                    @update:model-value="taxEdit" />
                </label>
                <label>
                  합계
                  <output class="amount-output">
                    {{ formatAmount(draftTotal) }}
                    <small>원</small>
                  </output>
                </label>
                <label class="memo-field">
                  적요
                  <UiInput
                    v-model="session.draft.memo"
                    placeholder="전표에 남길 내용을 입력하세요"
                    maxlength="500" />
                </label>
              </div>
              <label
                v-if="
                  ['11', '51'].includes(session.draft.type) &&
                  session.draft.vat &&
                  /^0+$/.test(session.draft.vat)
                "
                class="vat-confirm">
                <input v-model="session.draft.zeroVatConfirmed" type="checkbox" />
                확인요망: 과세 거래의 부가세가 0원임을 확인했습니다.
              </label>
              <div class="section-heading journal-heading">
                <h2>분개 입력</h2>
                <UiButton type="button" @click="addLine">+ 분개 행 추가</UiButton>
              </div>
              <p v-if="pagesPreview" class="journal-hint">
                샘플 계정과목으로 분개 입력을 체험할 수 있습니다.
              </p>
              <p v-else class="journal-hint">
                회사 계정과목에서 선택하고 분개를 입력하세요. 저장 시 서버에서 차변·대변 합계를
                검증합니다.
              </p>
              <div class="sales-grid-scroll">
                <table class="sales-grid line-grid voucher-grid">
                  <caption class="sr-only">전표 분개 입력</caption>
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th>계정과목</th>
                      <th class="numeric">차변(출금)</th>
                      <th class="numeric">대변(입금)</th>
                      <th>거래처</th>
                      <th>적요</th>
                      <th>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(line, index) in session.draft.lines" :key="index">
                      <td>
                        <UiSelect
                          v-model="line.side"
                          :aria-label="`분개 ${index + 1} 구분`"
                          :options="[
                            { value: 'debit', label: '차변' },
                            { value: 'credit', label: '대변' },
                          ]" />
                      </td>
                      <td>
                        <UiSelect
                          v-model="line.account"
                          :aria-label="`분개 ${index + 1} 계정과목`"
                          @keydown.f2.prevent="accountIndex = index"
                          :options="accountOptions" />
                      </td>
                      <td class="line-amount" :class="{ inactive: line.side !== 'debit' }">
                        <SalesAmountInput
                          v-if="line.side === 'debit'"
                          v-model="line.amount"
                          :aria-label="`분개 ${index + 1} 금액`" />
                        <span v-else aria-label="차변 금액 없음">—</span>
                      </td>
                      <td class="line-amount" :class="{ inactive: line.side !== 'credit' }">
                        <SalesAmountInput
                          v-if="line.side === 'credit'"
                          v-model="line.amount"
                          :aria-label="`분개 ${index + 1} 금액`" />
                        <span v-else aria-label="대변 금액 없음">—</span>
                      </td>
                      <td>{{ partnerName || '—' }}</td>
                      <td>
                        <input
                          v-model="line.memo"
                          class="input"
                          :list="`summary-${index}`"
                          :aria-label="`분개 ${index + 1} 적요`"
                          maxlength="500" />
                        <datalist :id="`summary-${index}`">
                          <option
                            v-for="summary in meta?.summaries?.filter(
                              (s) => s.accountId === line.account,
                            )"
                            :key="summary.id"
                            :value="summary.text" />
                        </datalist>
                      </td>
                      <td>
                        <UiButton
                          type="button"
                          :aria-label="`분개 ${index + 1} 삭제`"
                          @click="removeLine(index)">
                          ×
                        </UiButton>
                      </td>
                    </tr>
                    <tr v-if="!session.draft.lines.length">
                      <td colspan="7" class="empty-cell">
                        분개 행을 추가해 차변·대변 내역을 입력하세요.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="journal-totals voucher-summary">
                <span>
                  차변
                  <strong>{{ formatAmount(debit) }} 원</strong>
                </span>
                <span>
                  대변
                  <strong>{{ formatAmount(credit) }} 원</strong>
                </span>
                <span>
                  차액
                  <strong>
                    {{ formatAmount((BigInt(debit) - BigInt(credit)).toString()) }} 원
                  </strong>
                </span>
              </div>

              <div class="editor-actions">
                <span v-if="pagesPreview">입력한 내용은 현재 탭에서만 볼 수 있습니다.</span>
                <span v-else>
                  미확정 전표로 DB에 저장합니다. 확정·마감 전표는 수정할 수 없습니다.
                </span>
                <UiButton
                  type="submit"
                  variant="primary"
                  :disabled="pagesPreview || busy || loading || !meta || locked">
                  저장
                </UiButton>
              </div>
            </fieldset>
          </form>
        </section>
      </div>
      <aside v-show="detailOpen" id="sales-detail" class="sales-aside" aria-label="입력 도움말">
        <div class="aside-notice">
          <UiIcon name="help" :size="18" />
          <span>
            {{ tab.dirty ? '변경한 내용을 저장해 주세요.' : '전표를 선택하거나 신규 입력하세요.' }}
          </span>
        </div>
        <details class="aside-section shortcut-card">
          <summary>단축키 안내</summary>
          <div class="aside-body">
            <p>
              <kbd>F2</kbd>
              거래처 입력 중 검색
            </p>
            <p>
              <kbd>Tab</kbd>
              다음 입력 항목
            </p>
            <p>
              <kbd>Shift + Tab</kbd>
              이전 입력 항목
            </p>
          </div>
        </details>
        <section class="aside-section selected-info">
          <span class="aside-label">선택 전표</span>
          <strong>{{ selectedRecord?.entryNumber ?? '신규 전표' }}</strong>
          <span>
            {{ selectedRecord?.date ?? session.draft.date }} ·
            {{ selectedRecord?.status === 'posted' ? '확정' : '미확정' }}
          </span>
          <span v-if="locked" class="field-error">
            확정 전표 또는 마감 기간은 수정할 수 없습니다.
          </span>
        </section>
        <details class="aside-section" open>
          <summary>
            관리항목
            <span class="aside-tag">연동 준비</span>
          </summary>
          <div class="aside-body management-fields">
            <label v-for="field in ['사원', '부서', '현장', '프로젝트', '제품']" :key="field">
              {{ field }}
              <input
                class="input"
                :placeholder="field + '코드, ' + field + '명으로 검색'"
                disabled />
            </label>
            <p>관리항목은 아직 저장을 지원하지 않습니다.</p>
          </div>
        </details>
        <details class="aside-section">
          <summary>회계기간</summary>
          <div class="aside-body">
            <p>{{ currentPeriod?.start ?? '—' }} ~ {{ currentPeriod?.end ?? '—' }}</p>
            <p>{{ meta?.company }} · {{ meta?.establishment }}</p>
          </div>
        </details>
        <details class="aside-section">
          <summary>작성자</summary>
          <div class="aside-body">
            <p>{{ meta?.user ?? '정보 없음' }}</p>
            <p>저장 시 로그인한 사용자로 기록됩니다.</p>
          </div>
        </details>
        <details class="aside-section">
          <summary>메모</summary>
          <div class="aside-body">
            <p class="memo-preview">{{ session.draft.memo || '입력한 전표 적요가 없습니다.' }}</p>
          </div>
        </details>
        <details class="aside-section">
          <summary>입력 기준</summary>
          <div class="aside-body">
            <p>서버의 활성 부가세 유형을 지원합니다. 유형 탭은 공통 데이터의 조회 필터입니다.</p>
            <p>금액은 원 단위 정수로 입력합니다. 과세 거래의 부가세가 0원이면 확인이 필요합니다.</p>
            <p>차변·대변 합계가 일치해야 저장할 수 있습니다.</p>
          </div>
        </details>
      </aside>
    </div>
    <footer class="sales-status muted">
      <span>{{ tab.dirty ? '미저장 변경 있음' : visibleRows.length + '건 조회됨' }}</span>
      <span>
        {{ checkedRows.length }}건 체크 · 선택 공급가액
        {{ formatAmount(sumAmounts(checkedRows.map((row) => row.supply))) }}원
      </span>
    </footer>
    <SearchDialog
      title="계정과목 검색"
      :open="accountIndex !== null"
      :items="accountSearchItems"
      @close="accountIndex = null"
      @select="chooseAccount" />
    <VoucherSearchModal
      :open="advancedOpen"
      :value="advanced"
      @close="advancedOpen = false"
      @apply="(value) => (advanced = value)" />
    <SearchDialog
      :open="searchOpen"
      :items="partners"
      @close="searchOpen = false"
      @select="partnerSelected" />
    <ConfirmDialog :open="!!pending" @cancel="pending = null" @confirm="confirmPending" />
    <ConfirmDialog
      :open="deleting"
      title="전표를 삭제할까요?"
      message="선택한 전표를 삭제자료로 이동하고 활성 분개에서 제외합니다. 열린 회계기간에는 삭제자료에서 복원할 수 있습니다."
      confirm-label="삭제"
      @cancel="deleting = false"
      @confirm="remove" />
  </div>
</template>

<style scoped>
/* General-voucher typography, controls and grid come from main.css. */
.sales-journal {
  min-width: 0;
  color: var(--text);
}
.sales-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
}
.sales-layout-wide {
  grid-template-columns: minmax(0, 1fr);
}
.sales-main,
.sales-card {
  min-width: 0;
}
.sales-main {
  display: flex;
  flex-direction: column;
}
.context-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  color: var(--secondary);
  font-size: 12px;
  line-height: 1.6;
}
.context-notice svg {
  flex-shrink: 0;
}
.sales-more {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  margin: 10px 0;
}
.sales-more > summary {
  cursor: pointer;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
}
.sales-more > summary span {
  font-weight: 400;
  color: var(--secondary);
  margin-left: 10px;
}
.sales-more[open] > summary {
  border-bottom: 1px solid var(--border);
}
.sales-filters {
  margin-top: 10px;
}
.sales-filters label,
.period-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.period-toggle {
  gap: 0;
}
.period-toggle button {
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--secondary);
  font: inherit;
  cursor: pointer;
}
.period-toggle button:first-child {
  border-radius: 4px 0 0 4px;
}
.period-toggle button:last-child {
  border-radius: 0 4px 4px 0;
  border-left: 0;
}
.period-toggle button[aria-pressed='true'] {
  background: var(--primary-light);
  color: var(--primary);
}
.sales-search {
  flex: 1;
  min-width: 170px;
}
.voucher-section-title {
  flex-wrap: wrap;
}
.voucher-section-title strong {
  overflow-wrap: anywhere;
}
.voucher-section-title select {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 5px;
  background: var(--surface);
  color: var(--text);
}
.sales-grid-scroll {
  overflow: auto;
}
.record-scroll {
  resize: vertical;
  height: 340px;
}
.record-scroll .sales-grid {
  min-width: 2000px;
  table-layout: auto;
}
.record-scroll .numeric {
  min-width: 145px;
}
.record-scroll th {
  resize: horizontal;
  overflow: auto;
  min-width: 55px;
}
.record-scroll tbody tr {
  cursor: pointer;
}
.record-scroll td:first-child,
.record-scroll th:first-child {
  position: sticky;
  left: 0;
  background: var(--surface);
  z-index: 3;
}
.record-scroll th:first-child {
  background: #edf2f8;
  z-index: 4;
}
.record-scroll td select {
  max-width: 160px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.sales-grid input[type='checkbox'] {
  accent-color: var(--primary);
}
.sales-grid .date-cell {
  text-align: center;
}
.sales-grid .code {
  color: var(--secondary);
  font-variant-numeric: tabular-nums;
}
.sales-grid .partner-cell {
  font-weight: 500;
}
.sales-grid .collect-chip {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
}
.sales-grid .collect-chip.is-electronic {
  background: #e8f1fd;
  color: #1d4f91;
}
.sales-grid .collect-chip.is-manual {
  background: #f1f3f6;
  color: #475569;
}
.sales-grid .collect-edit {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.type-label {
  color: var(--primary);
}
.type-label.purchase {
  color: var(--text);
}
.review-label {
  display: block;
  font-size: 11px;
  color: var(--warning);
}
.sales-grid .total-cell {
  font-weight: 600;
}
.sales-grid tfoot td {
  position: sticky;
  bottom: 0;
  height: 34px;
  background: #f6f8fb;
  font-weight: 600;
  border-top: 1px solid var(--border);
}
.sales-grid .empty-cell {
  height: 180px;
  padding: 24px;
  text-align: center;
  color: var(--secondary);
  white-space: normal;
}
.list-footer,
.sales-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  padding: 10px 0;
  color: var(--secondary);
}
.editor {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
}
.section-heading h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.calculation-tools {
  margin: 0 12px 8px;
}
.entry-fields {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.sales-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 12px;
}
.sales-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
}
.sales-form .wide {
  grid-column: span 2;
}
.memo-field {
  grid-column: span 3;
}
.partner-input {
  display: flex;
  gap: 4px;
}
.partner-input :deep(.input) {
  min-width: 0;
  width: 100%;
}
.amount-output {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 36px;
  padding: 6px 10px;
  background: #f6f8fb;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-weight: 600;
}
.amount-output small {
  color: var(--secondary);
  font-weight: 400;
}
.vat-confirm {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 12px 10px;
  padding: 10px;
  background: #fff8e6;
  color: var(--warning);
  font-size: 12px;
}
.journal-heading {
  border-top: 1px solid var(--border);
}
.journal-hint {
  margin: 0;
  padding: 0 12px 10px;
  color: var(--secondary);
  font-size: 12px;
}
.line-grid {
  min-width: 850px;
}
.line-grid td {
  padding: 2px 6px;
}
.line-grid td:first-child {
  width: 90px;
}
.line-grid td:nth-child(2) {
  width: 200px;
}
.line-grid td:last-child {
  width: 55px;
}
.line-grid :deep(.input) {
  width: 100%;
  min-width: 0;
  font-size: 12px;
  min-height: 28px;
}
.line-amount {
  min-width: 130px;
  text-align: right;
}
.line-grid td.inactive {
  color: var(--secondary);
}
.journal-totals strong {
  margin-left: 8px;
}
.editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--secondary);
}
.sales-aside {
  display: grid;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
  background: var(--surface);
}
.aside-notice {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--secondary);
  line-height: 1.6;
}
.aside-section {
  min-width: 0;
  font-size: 12px;
}
.aside-section summary {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  cursor: pointer;
}
.aside-body {
  padding: 10px 0;
}
.aside-body p {
  margin: 0 0 8px;
  line-height: 1.7;
  color: var(--secondary);
}
.selected-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-wrap: anywhere;
  padding: 12px 0;
}
.aside-label,
.aside-tag {
  color: var(--secondary);
  font-size: 11px;
}
.aside-tag {
  float: right;
}
.management-fields {
  display: grid;
  gap: 10px;
}
.management-fields label {
  display: grid;
  gap: 5px;
}
.management-fields input {
  min-width: 0;
  width: 100%;
}
.memo-preview {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.error-notice,
.result-notice {
  padding: 10px 12px;
  margin: 10px 0;
  font-size: 12px;
  border-radius: 6px;
}
.error-notice {
  color: var(--danger);
  background: #fff1f2;
}
.result-notice {
  color: var(--success);
  background: #eefaf3;
}
.field-error {
  color: var(--danger);
  font-size: 12px;
}
.board-actions {
  display: flex;
  gap: 8px;
  padding: 8px 0 0;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}
@media (max-width: 1100px) {
  .sales-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .sales-aside {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .sales-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .memo-field {
    grid-column: span 2;
  }
  .sales-aside {
    grid-template-columns: minmax(0, 1fr);
  }
  .sales-more > summary span {
    display: none;
  }
  .sales-search {
    flex-basis: 100%;
  }
}
@media (max-width: 640px) {
  .sales-journal .voucher-help {
    font-size: 12px;
  }
  .sales-journal .voucher-help::after {
    content: none;
  }
}
</style>


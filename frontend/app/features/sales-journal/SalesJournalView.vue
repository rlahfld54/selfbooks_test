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
  <div data-ui-sales-journal-view class="sales-journal voucher-screen" :class="{ 'voucher-compact': density === 'compact' }">
    <PageToolbar data-ui-sales-journal-view>
    <UiBadge data-ui-sales-journal-view tone="neutral">
      {{ pagesPreview ? '미리보기' : (meta?.company ?? '연결 대기') }}
    </UiBadge>
    <template #delete>
      <UiButton data-ui-sales-journal-view
        :disabled="pagesPreview || !session.selected || busy || loading || locked"
        @click="deleting = true">
        삭제
      </UiButton>
    </template>
    <UiButton data-ui-sales-journal-view
      :aria-expanded="detailOpen"
      aria-controls="sales-detail"
      @click="detailOpen = !detailOpen">
      {{ detailOpen ? '인사이트 닫기' : '인사이트 열기' }}
    </UiButton>
    <UiButton data-ui-sales-journal-view
      variant="primary"
      :disabled="pagesPreview || busy || loading || !meta || locked"
      @click="save">
      {{ busy ? '저장 중…' : '전표 저장' }}
    </UiButton>
    </PageToolbar>
    <WorkspaceVoucherNavigation data-ui-sales-journal-view />
    <p data-ui-sales-journal-view v-if="pinned" role="status">하단 전표 고정 중 — 고정 전환 버튼으로 해제할 수 있습니다.</p>
    <div data-ui-sales-journal-view class="context-notice">
      <UiIcon data-ui-sales-journal-view name="document" :size="17" />
      <span data-ui-sales-journal-view v-if="pagesPreview">
        공개 미리보기입니다. 샘플 전표를 조회하고 입력 화면을 체험할 수 있습니다. 저장과 삭제는
        비활성화되어 있습니다.
      </span>
      <span data-ui-sales-journal-view v-else>
        실제 저장 회사: {{ meta?.company ?? '연결 중' }} · 본점. 상단 샘플 회사 선택과 별개로
        서버에서 고정된 회사에 저장합니다. 저장 전 입력만 탭 안에서 유지됩니다.
      </span>
    </div>
    <div data-ui-sales-journal-view v-if="error" class="error-notice" role="alert">
      {{ error }}
      <UiButton data-ui-sales-journal-view :disabled="loading || busy" @click="load">다시 조회</UiButton>
    </div>
    <p data-ui-sales-journal-view v-if="loading" role="status">전표와 기초정보를 불러오는 중입니다…</p>
    <p data-ui-sales-journal-view v-if="notice" class="result-notice" role="status">{{ notice }}</p>
    <div data-ui-sales-journal-view
      class="sales-layout"
      :class="{ 'sales-layout-wide': !detailOpen }"
      :inert="busy || loading">
      <div data-ui-sales-journal-view class="sales-main">
        <SalesVoucherBoard data-ui-sales-journal-view
          ref="board"
          v-model:checked="selectedIds"
          v-model:density="density"
          :journal="salesJournal"
          :pinned="pinned"
          :advanced="advanced"
          @search="focusSearch"
          @editor="journalOpen = true">
          <template #more>
            <VoucherOperations data-ui-sales-journal-view
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
            <div data-ui-sales-journal-view class="board-actions">
              <UiButton data-ui-sales-journal-view :disabled="busy || loading || !meta" @click="protect(reset)">
                + 신규 전표 (상세 입력)
              </UiButton>
            </div>
          </template>
        </SalesVoucherBoard>

        <div data-ui-sales-journal-view class="voucher-section-title">
          <strong data-ui-sales-journal-view>분개 상세 · {{ selectedRecord?.entryNumber ?? '신규 전표' }}</strong>
          <UiBadge data-ui-sales-journal-view v-if="tab.dirty" tone="warning">미저장 변경</UiBadge>
          <UiButton data-ui-sales-journal-view
            :aria-expanded="journalOpen"
            aria-controls="sales-journal-editor"
            @click="journalOpen = !journalOpen">
            {{ journalOpen ? '분개 상세 접기' : '분개 상세 펼치기' }}
          </UiButton>
        </div>
        <section data-ui-sales-journal-view
          v-show="journalOpen"
          id="sales-journal-editor"
          class="sales-card editor"
          aria-labelledby="sales-editor-heading">
          <div data-ui-sales-journal-view class="section-heading">
            <h2 data-ui-sales-journal-view id="sales-editor-heading">
              {{ session.selected ? '전표 수정' : '신규 전표 입력' }}
            </h2>
            <UiBadge data-ui-sales-journal-view :tone="tab.dirty ? 'warning' : 'neutral'">
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
          <details data-ui-sales-journal-view class="sales-more calculation-tools">
            <summary data-ui-sales-journal-view>
              계산 및 자동분개
              <span data-ui-sales-journal-view>수량·단가 계산 · 복수거래 · 입력 환경설정</span>
            </summary>
            <VoucherEditorTools data-ui-sales-journal-view
              v-if="meta"
              ref="editorTools"
              :draft="session.draft"
              :meta="meta"
              :locked="locked"
              @edit="edit"
              @tax-edit="taxEdit"
              @refresh="load" />
          </details>
          <form data-ui-sales-journal-view @submit.prevent="save" @input="edit" @change="edit">
            <fieldset data-ui-sales-journal-view :disabled="locked || !meta" class="entry-fields">
              <div data-ui-sales-journal-view class="sales-form">
                <label data-ui-sales-journal-view class="wide">
                  회계기간
                  <UiSelect data-ui-sales-journal-view
                    aria-label="회계기간"
                    v-model="session.draft.periodId"
                    :options="periodOptions" />
                </label>
                <label data-ui-sales-journal-view>
                  전표일자
                  <input data-ui-sales-journal-view
                    v-model="session.draft.date"
                    type="date"
                    class="input"
                    :min="currentPeriod?.start"
                    :max="currentPeriod?.end" />
                </label>
                <label data-ui-sales-journal-view>
                  거래유형
                  <UiSelect data-ui-sales-journal-view
                    aria-label="거래유형"
                    v-model="session.draft.type"
                    :options="availableTypes"
                    @update:model-value="taxEdit" />
                </label>
                <label data-ui-sales-journal-view class="wide">
                  거래처
                  <span data-ui-sales-journal-view class="partner-input">
                    <UiInput data-ui-sales-journal-view
                      :model-value="partnerName"
                      readonly
                      placeholder="F2 또는 검색으로 거래처 선택"
                      @keydown.f2.prevent="searchOpen = true" />
                    <UiButton data-ui-sales-journal-view type="button" aria-label="거래처 검색" @click="searchOpen = true">
                      <UiIcon data-ui-sales-journal-view name="search" :size="16" />
                    </UiButton>
                  </span>
                </label>
                <label data-ui-sales-journal-view>
                  품명
                  <UiInput data-ui-sales-journal-view
                    v-model="session.draft.item"
                    placeholder="품명 또는 거래 내용"
                    maxlength="200" />
                </label>
                <label data-ui-sales-journal-view>
                  결제방법
                  <UiSelect data-ui-sales-journal-view
                    aria-label="결제방법"
                    v-model="session.draft.payment"
                    :options="payments" />
                </label>
                <label data-ui-sales-journal-view>
                  공급가액
                  <SalesAmountInput data-ui-sales-journal-view
                    v-model="session.draft.supply"
                    placeholder="0"
                    @update:model-value="taxEdit" />
                </label>
                <label data-ui-sales-journal-view>
                  부가세
                  <SalesAmountInput data-ui-sales-journal-view
                    v-model="session.draft.vat"
                    placeholder="수기 입력"
                    @update:model-value="taxEdit" />
                </label>
                <label data-ui-sales-journal-view>
                  합계
                  <output data-ui-sales-journal-view class="amount-output">
                    {{ formatAmount(draftTotal) }}
                    <small data-ui-sales-journal-view>원</small>
                  </output>
                </label>
                <label data-ui-sales-journal-view class="memo-field">
                  적요
                  <UiInput data-ui-sales-journal-view
                    v-model="session.draft.memo"
                    placeholder="전표에 남길 내용을 입력하세요"
                    maxlength="500" />
                </label>
              </div>
              <label data-ui-sales-journal-view
                v-if="
                  ['11', '51'].includes(session.draft.type) &&
                  session.draft.vat &&
                  /^0+$/.test(session.draft.vat)
                "
                class="vat-confirm">
                <input data-ui-sales-journal-view v-model="session.draft.zeroVatConfirmed" type="checkbox" />
                확인요망: 과세 거래의 부가세가 0원임을 확인했습니다.
              </label>
              <div data-ui-sales-journal-view class="section-heading journal-heading">
                <h2 data-ui-sales-journal-view>분개 입력</h2>
                <UiButton data-ui-sales-journal-view type="button" @click="addLine">+ 분개 행 추가</UiButton>
              </div>
              <p data-ui-sales-journal-view v-if="pagesPreview" class="journal-hint">
                샘플 계정과목으로 분개 입력을 체험할 수 있습니다.
              </p>
              <p data-ui-sales-journal-view v-else class="journal-hint">
                회사 계정과목에서 선택하고 분개를 입력하세요. 저장 시 서버에서 차변·대변 합계를
                검증합니다.
              </p>
              <div data-ui-sales-journal-view class="sales-grid-scroll">
                <table data-ui-sales-journal-view class="sales-grid line-grid voucher-grid">
                  <caption data-ui-sales-journal-view class="sr-only">전표 분개 입력</caption>
                  <thead data-ui-sales-journal-view>
                    <tr data-ui-sales-journal-view>
                      <th data-ui-sales-journal-view>구분</th>
                      <th data-ui-sales-journal-view>계정과목</th>
                      <th data-ui-sales-journal-view class="numeric">차변(출금)</th>
                      <th data-ui-sales-journal-view class="numeric">대변(입금)</th>
                      <th data-ui-sales-journal-view>거래처</th>
                      <th data-ui-sales-journal-view>적요</th>
                      <th data-ui-sales-journal-view>삭제</th>
                    </tr>
                  </thead>
                  <tbody data-ui-sales-journal-view>
                    <tr data-ui-sales-journal-view v-for="(line, index) in session.draft.lines" :key="index">
                      <td data-ui-sales-journal-view>
                        <UiSelect data-ui-sales-journal-view
                          v-model="line.side"
                          :aria-label="`분개 ${index + 1} 구분`"
                          :options="[
                            { value: 'debit', label: '차변' },
                            { value: 'credit', label: '대변' },
                          ]" />
                      </td>
                      <td data-ui-sales-journal-view>
                        <UiSelect data-ui-sales-journal-view
                          v-model="line.account"
                          :aria-label="`분개 ${index + 1} 계정과목`"
                          @keydown.f2.prevent="accountIndex = index"
                          :options="accountOptions" />
                      </td>
                      <td data-ui-sales-journal-view class="line-amount" :class="{ inactive: line.side !== 'debit' }">
                        <SalesAmountInput data-ui-sales-journal-view
                          v-if="line.side === 'debit'"
                          v-model="line.amount"
                          :aria-label="`분개 ${index + 1} 금액`" />
                        <span data-ui-sales-journal-view v-else aria-label="차변 금액 없음">—</span>
                      </td>
                      <td data-ui-sales-journal-view class="line-amount" :class="{ inactive: line.side !== 'credit' }">
                        <SalesAmountInput data-ui-sales-journal-view
                          v-if="line.side === 'credit'"
                          v-model="line.amount"
                          :aria-label="`분개 ${index + 1} 금액`" />
                        <span data-ui-sales-journal-view v-else aria-label="대변 금액 없음">—</span>
                      </td>
                      <td data-ui-sales-journal-view>{{ partnerName || '—' }}</td>
                      <td data-ui-sales-journal-view>
                        <input data-ui-sales-journal-view
                          v-model="line.memo"
                          class="input"
                          :list="`summary-${index}`"
                          :aria-label="`분개 ${index + 1} 적요`"
                          maxlength="500" />
                        <datalist data-ui-sales-journal-view :id="`summary-${index}`">
                          <option data-ui-sales-journal-view
                            v-for="summary in meta?.summaries?.filter(
                              (s) => s.accountId === line.account,
                            )"
                            :key="summary.id"
                            :value="summary.text" />
                        </datalist>
                      </td>
                      <td data-ui-sales-journal-view>
                        <UiButton data-ui-sales-journal-view
                          type="button"
                          :aria-label="`분개 ${index + 1} 삭제`"
                          @click="removeLine(index)">
                          ×
                        </UiButton>
                      </td>
                    </tr>
                    <tr data-ui-sales-journal-view v-if="!session.draft.lines.length">
                      <td data-ui-sales-journal-view colspan="7" class="empty-cell">
                        분개 행을 추가해 차변·대변 내역을 입력하세요.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div data-ui-sales-journal-view class="journal-totals voucher-summary">
                <span data-ui-sales-journal-view>
                  차변
                  <strong data-ui-sales-journal-view>{{ formatAmount(debit) }} 원</strong>
                </span>
                <span data-ui-sales-journal-view>
                  대변
                  <strong data-ui-sales-journal-view>{{ formatAmount(credit) }} 원</strong>
                </span>
                <span data-ui-sales-journal-view>
                  차액
                  <strong data-ui-sales-journal-view>
                    {{ formatAmount((BigInt(debit) - BigInt(credit)).toString()) }} 원
                  </strong>
                </span>
              </div>

              <div data-ui-sales-journal-view class="editor-actions">
                <span data-ui-sales-journal-view v-if="pagesPreview">입력한 내용은 현재 탭에서만 볼 수 있습니다.</span>
                <span data-ui-sales-journal-view v-else>
                  미확정 전표로 DB에 저장합니다. 확정·마감 전표는 수정할 수 없습니다.
                </span>
                <UiButton data-ui-sales-journal-view
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
      <aside data-ui-sales-journal-view v-show="detailOpen" id="sales-detail" class="sales-aside" aria-label="입력 도움말">
        <div data-ui-sales-journal-view class="aside-notice">
          <UiIcon data-ui-sales-journal-view name="help" :size="18" />
          <span data-ui-sales-journal-view>
            {{ tab.dirty ? '변경한 내용을 저장해 주세요.' : '전표를 선택하거나 신규 입력하세요.' }}
          </span>
        </div>
        <details data-ui-sales-journal-view class="aside-section shortcut-card">
          <summary data-ui-sales-journal-view>단축키 안내</summary>
          <div data-ui-sales-journal-view class="aside-body">
            <p data-ui-sales-journal-view>
              <kbd data-ui-sales-journal-view>F2</kbd>
              거래처 입력 중 검색
            </p>
            <p data-ui-sales-journal-view>
              <kbd data-ui-sales-journal-view>Tab</kbd>
              다음 입력 항목
            </p>
            <p data-ui-sales-journal-view>
              <kbd data-ui-sales-journal-view>Shift + Tab</kbd>
              이전 입력 항목
            </p>
          </div>
        </details>
        <section data-ui-sales-journal-view class="aside-section selected-info">
          <span data-ui-sales-journal-view class="aside-label">선택 전표</span>
          <strong data-ui-sales-journal-view>{{ selectedRecord?.entryNumber ?? '신규 전표' }}</strong>
          <span data-ui-sales-journal-view>
            {{ selectedRecord?.date ?? session.draft.date }} ·
            {{ selectedRecord?.status === 'posted' ? '확정' : '미확정' }}
          </span>
          <span data-ui-sales-journal-view v-if="locked" class="field-error">
            확정 전표 또는 마감 기간은 수정할 수 없습니다.
          </span>
        </section>
        <details data-ui-sales-journal-view class="aside-section" open>
          <summary data-ui-sales-journal-view>
            관리항목
            <span data-ui-sales-journal-view class="aside-tag">연동 준비</span>
          </summary>
          <div data-ui-sales-journal-view class="aside-body management-fields">
            <label data-ui-sales-journal-view v-for="field in ['사원', '부서', '현장', '프로젝트', '제품']" :key="field">
              {{ field }}
              <input data-ui-sales-journal-view
                class="input"
                :placeholder="field + '코드, ' + field + '명으로 검색'"
                disabled />
            </label>
            <p data-ui-sales-journal-view>관리항목은 아직 저장을 지원하지 않습니다.</p>
          </div>
        </details>
        <details data-ui-sales-journal-view class="aside-section">
          <summary data-ui-sales-journal-view>회계기간</summary>
          <div data-ui-sales-journal-view class="aside-body">
            <p data-ui-sales-journal-view>{{ currentPeriod?.start ?? '—' }} ~ {{ currentPeriod?.end ?? '—' }}</p>
            <p data-ui-sales-journal-view>{{ meta?.company }} · {{ meta?.establishment }}</p>
          </div>
        </details>
        <details data-ui-sales-journal-view class="aside-section">
          <summary data-ui-sales-journal-view>작성자</summary>
          <div data-ui-sales-journal-view class="aside-body">
            <p data-ui-sales-journal-view>{{ meta?.user ?? '정보 없음' }}</p>
            <p data-ui-sales-journal-view>저장 시 로그인한 사용자로 기록됩니다.</p>
          </div>
        </details>
        <details data-ui-sales-journal-view class="aside-section">
          <summary data-ui-sales-journal-view>메모</summary>
          <div data-ui-sales-journal-view class="aside-body">
            <p data-ui-sales-journal-view class="memo-preview">{{ session.draft.memo || '입력한 전표 적요가 없습니다.' }}</p>
          </div>
        </details>
        <details data-ui-sales-journal-view class="aside-section">
          <summary data-ui-sales-journal-view>입력 기준</summary>
          <div data-ui-sales-journal-view class="aside-body">
            <p data-ui-sales-journal-view>서버의 활성 부가세 유형을 지원합니다. 유형 탭은 공통 데이터의 조회 필터입니다.</p>
            <p data-ui-sales-journal-view>금액은 원 단위 정수로 입력합니다. 과세 거래의 부가세가 0원이면 확인이 필요합니다.</p>
            <p data-ui-sales-journal-view>차변·대변 합계가 일치해야 저장할 수 있습니다.</p>
          </div>
        </details>
      </aside>
    </div>
    <footer data-ui-sales-journal-view class="sales-status muted">
      <span data-ui-sales-journal-view>{{ tab.dirty ? '미저장 변경 있음' : visibleRows.length + '건 조회됨' }}</span>
      <span data-ui-sales-journal-view>
        {{ checkedRows.length }}건 체크 · 선택 공급가액
        {{ formatAmount(sumAmounts(checkedRows.map((row) => row.supply))) }}원
      </span>
    </footer>
    <SearchDialog data-ui-sales-journal-view
      title="계정과목 검색"
      :open="accountIndex !== null"
      :items="accountSearchItems"
      @close="accountIndex = null"
      @select="chooseAccount" />
    <VoucherSearchModal data-ui-sales-journal-view
      :open="advancedOpen"
      :value="advanced"
      @close="advancedOpen = false"
      @apply="(value) => (advanced = value)" />
    <SearchDialog data-ui-sales-journal-view
      :open="searchOpen"
      :items="partners"
      @close="searchOpen = false"
      @select="partnerSelected" />
    <ConfirmDialog data-ui-sales-journal-view :open="!!pending" @cancel="pending = null" @confirm="confirmPending" />
    <ConfirmDialog data-ui-sales-journal-view
      :open="deleting"
      title="전표를 삭제할까요?"
      message="선택한 전표를 삭제자료로 이동하고 활성 분개에서 제외합니다. 열린 회계기간에는 삭제자료에서 복원할 수 있습니다."
      confirm-label="삭제"
      @cancel="deleting = false"
      @confirm="remove" />
  </div>
</template>

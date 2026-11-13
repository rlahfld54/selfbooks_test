<script setup lang="ts">
import WorkspaceVoucherNavigation from '~/features/workspace/components/WorkspaceVoucherNavigation.vue'
const detailOpen = ref(true)
import { formatAmount } from '~/utils/formatAmount'
import { payments, sumAmounts, transactionTypes } from './services/salesJournal'
import SalesAmountInput from './SalesAmountInput.vue'
import { useSalesJournal } from './composables/useSalesJournal'
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
  supplyTotal,
  vatTotal,
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
} = useSalesJournal()
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
  <div class="sales-journal">
    <PageToolbar
      title="매입매출전표입력"
      description="거래 내역부터 분개까지, 한 화면에서 입력하세요."
    >
      <template #eyebrow>전표관리</template>
      <UiBadge tone="primary">{{ pagesPreview ? '샘플 데이터' : meta?.company ?? 'DB 연결' }}</UiBadge>
      <UiButton :disabled="busy || loading || !meta" @click="protect(reset)"
        ><UiIcon name="plus" :size="16" />신규 전표</UiButton
      >
      <UiButton :disabled="pagesPreview || !session.selected || busy || loading || locked" @click="deleting = true"
        >삭제</UiButton
      >
      <UiButton variant="primary" :disabled="pagesPreview || busy || loading || !meta || locked" @click="save"
        >저장</UiButton
      >
      <UiButton :aria-expanded="detailOpen" aria-controls="sales-detail" @click="detailOpen = !detailOpen">
        {{ detailOpen ? '상세 패널 접기' : '상세 패널 열기' }}
      </UiButton>
    </PageToolbar>
    <WorkspaceVoucherNavigation />
    <div class="context-notice">
      <UiIcon name="document" :size="17" />
      <span v-if="pagesPreview">공개 미리보기입니다. 샘플 전표를 조회하고 입력 화면을 체험할 수 있습니다. 저장과 삭제는 비활성화되어 있습니다.</span>
      <span v-else
        >실제 저장 회사: {{ meta?.company ?? '연결 중' }} · 본점. 상단 샘플 회사 선택과 별개로
        서버에서 고정된 회사에 저장합니다. 저장 전 입력만 탭 안에서 유지됩니다.</span
      >
    </div>
    <div v-if="error" class="error-notice" role="alert">
      {{ error }} <UiButton :disabled="loading || busy" @click="load">다시 조회</UiButton>
    </div>
    <p v-if="loading" role="status">전표와 기초정보를 불러오는 중입니다…</p>
    <p v-if="notice" class="result-notice" role="status">{{ notice }}</p>
    <div class="sales-layout" :class="{ 'sales-layout-wide': !detailOpen }" :inert="busy || loading">
      <div class="sales-main">
        <section class="sales-card" aria-label="전표 조회">
          <div class="type-tabs" aria-label="거래유형 필터">
            <button
              v-for="option in [
                { value: '', label: '전체' },
                { value: '11', label: '매출 과세' },
                { value: '51', label: '매입 과세' },
              ]"
              :key="option.value"
              :aria-pressed="session.applied.type === option.value"
              :class="{ active: session.applied.type === option.value }"
              @click="filterType(option.value)"
            >
              {{ option.label }}
            </button>
            <span>단위: 원</span>
          </div>
          <form class="sales-filters" @submit.prevent="queryRecords">
            <label
              >조회기간
              <input
                v-model="session.filter.from"
                type="date"
                class="input"
                aria-label="조회 시작일"
            /></label>
            <span>~</span
            ><input
              v-model="session.filter.to"
              type="date"
              class="input"
              aria-label="조회 종료일"
            />
            <UiInput
              v-model="session.filter.query"
              aria-label="전표 검색"
              placeholder="거래처·사업자번호·품명·적요 검색"
              class="sales-search"
            />
            <UiButton type="submit">조회</UiButton>
          </form>
          <p v-if="filterError" class="field-error" role="alert">{{ filterError }}</p>
          <div class="sales-grid-scroll">
            <table class="sales-grid">
              <caption class="sr-only">
                매입매출전표 목록
              </caption>
              <thead>
                <tr>
                  <th>선택</th>
                  <th>전표일자</th>
                  <th>사업자번호</th>
                  <th>거래처</th>
                  <th>유형</th>
                  <th>품명</th>
                  <th class="numeric">공급가액</th>
                  <th class="numeric">부가세</th>
                  <th class="numeric">합계</th>
                  <th>결제</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in rows"
                  :key="row.id"
                  :class="{ selected: session.selected === row.id }"
                  @click="select(row)"
                >
                  <td>
                    <input
                      type="radio"
                      name="sales-record"
                      :checked="session.selected === row.id"
                      :aria-label="`${row.date} ${row.partner} 전표 선택`"
                      @click.stop="select(row)"
                    />
                  </td>
                  <td>{{ row.date }}</td>
                  <td class="code">{{ row.partnerCode || '—' }}</td>
                  <td class="partner-cell">{{ row.partner }}</td>
                  <td>
                    <span class="type-label" :class="{ purchase: row.type === '51' }">{{
                      row.type === '11' ? '매출 과세' : '매입 과세'
                    }}</span>
                  </td>
                  <td>{{ row.item || '—' }}</td>
                  <td class="numeric">{{ formatAmount(row.supply) }}</td>
                  <td class="numeric" :class="{ 'zero-vat': BigInt(row.vat) === 0n }">
                    {{ formatAmount(row.vat)
                    }}<span v-if="row.needsReview" class="review-label">확인요망 · 확인완료</span>
                  </td>
                  <td class="numeric total-cell">
                    {{ formatAmount(sumAmounts([row.supply, row.vat])) }}
                  </td>
                  <td>{{ row.payment }}</td>
                </tr>
                <tr v-if="!rows.length">
                  <td colspan="10" class="empty-cell">
                    조회된 전표가 없습니다. 기간과 검색어를 확인하거나 신규 전표를 입력하세요.
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="6">
                    조회 합계 <span>{{ rows.length }}건</span>
                  </td>
                  <td class="numeric">{{ formatAmount(supplyTotal) }}</td>
                  <td class="numeric">{{ formatAmount(vatTotal) }}</td>
                  <td class="numeric">{{ formatAmount(sumAmounts([supplyTotal, vatTotal])) }}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="list-footer">
            <span>행을 선택하면 아래에서 내용을 수정할 수 있습니다.</span
            ><span>{{ rows.length }} / {{ session.rows.length }}건</span>
          </div>
        </section>

        <section class="sales-card editor" aria-labelledby="sales-editor-heading">
          <div class="section-heading">
            <h2 id="sales-editor-heading">
              {{ session.selected ? '전표 수정' : '신규 전표 입력' }}
            </h2>
            <UiBadge :tone="tab.dirty ? 'warning' : 'neutral'">{{
              tab.dirty
                ? '미저장 변경'
                : locked
                  ? '수정 불가'
                  : session.selected
                    ? '미확정 전표'
                    : '입력 대기'
            }}</UiBadge>
          </div>
          <form @submit.prevent="save" @input="edit" @change="edit">
            <fieldset :disabled="locked || !meta" class="entry-fields">
              <div class="sales-form">
                <label class="wide"
                  >회계기간
                  <UiSelect
                    aria-label="회계기간"
                    v-model="session.draft.periodId"
                    :options="periodOptions" /></label
                ><label
                  >전표일자
                  <input
                    v-model="session.draft.date"
                    type="date"
                    class="input"
                    :min="currentPeriod?.start"
                    :max="currentPeriod?.end"
                /></label>
                <label
                  >거래유형
                  <UiSelect
                    aria-label="거래유형"
                    v-model="session.draft.type"
                    :options="transactionTypes"
                    @update:model-value="taxEdit"
                /></label>
                <label class="wide"
                  >거래처
                  <span class="partner-input"
                    ><UiInput
                      :model-value="partnerName"
                      readonly
                      placeholder="F2 또는 검색으로 거래처 선택"
                      @keydown.f2.prevent="searchOpen = true" /><UiButton
                      type="button"
                      aria-label="거래처 검색"
                      @click="searchOpen = true"
                      ><UiIcon name="search" :size="16" /></UiButton></span
                ></label>
                <label
                  >품명
                  <UiInput
                    v-model="session.draft.item"
                    placeholder="품명 또는 거래 내용"
                    maxlength="200"
                /></label>
                <label
                  >결제방법
                  <UiSelect
                    aria-label="결제방법"
                    v-model="session.draft.payment"
                    :options="payments"
                /></label>
                <label
                  >공급가액
                  <SalesAmountInput
                    v-model="session.draft.supply"
                    placeholder="0"
                    @update:model-value="taxEdit"
                /></label>
                <label
                  >부가세
                  <SalesAmountInput
                    v-model="session.draft.vat"
                    placeholder="수기 입력"
                    @update:model-value="taxEdit"
                /></label>
                <label
                  >합계
                  <output class="amount-output"
                    >{{ formatAmount(draftTotal) }}<small>원</small></output
                  ></label
                >
                <label class="memo-field"
                  >적요
                  <UiInput
                    v-model="session.draft.memo"
                    placeholder="전표에 남길 내용을 입력하세요"
                    maxlength="500"
                /></label>
              </div>
              <label v-if="session.draft.vat && /^0+$/.test(session.draft.vat)" class="vat-confirm"
                ><input v-model="session.draft.zeroVatConfirmed" type="checkbox" /> 확인요망: 과세
                거래의 부가세가 0원임을 확인했습니다.</label
              >
              <div class="section-heading journal-heading">
                <h2>분개 입력</h2>
                <UiButton
                  type="button"
                  @click="addLine"
                  >+ 분개 행 추가</UiButton
                >
              </div>
              <p v-if="pagesPreview" class="journal-hint">샘플 계정과목으로 분개 입력을 체험할 수 있습니다.</p>
              <p v-else class="journal-hint">
                회사 계정과목에서 선택하고 분개를 입력하세요. 저장 시 서버에서 차변·대변 합계를
                검증합니다.
              </p>
              <div class="sales-grid-scroll">
                <table class="sales-grid line-grid">
                  <caption class="sr-only">
                    전표 분개 입력
                  </caption>
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th>계정과목</th>
                      <th class="numeric">금액</th>
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
                          ]"
                        />
                      </td>
                      <td>
                        <UiSelect
                          v-model="line.account"
                          :aria-label="`분개 ${index + 1} 계정과목`"
                          :options="accountOptions"
                        />
                      </td>
                      <td>
                        <SalesAmountInput
                          v-model="line.amount"
                          :aria-label="`분개 ${index + 1} 금액`"
                        />
                      </td>
                      <td>
                        <UiInput v-model="line.memo" :aria-label="`분개 ${index + 1} 적요`" />
                      </td>
                      <td>
                        <UiButton
                          type="button"
                          :aria-label="`분개 ${index + 1} 삭제`"
                          @click="removeLine(index)"
                          >×</UiButton
                        >
                      </td>
                    </tr>
                    <tr v-if="!session.draft.lines.length">
                      <td colspan="5" class="empty-cell">
                        분개 행을 추가해 차변·대변 내역을 입력하세요.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="journal-totals">
                <span
                  >차변 <strong>{{ formatAmount(debit) }} 원</strong></span
                ><span
                  >대변 <strong>{{ formatAmount(credit) }} 원</strong></span
                ><span
                  >차액
                  <strong
                    >{{ formatAmount((BigInt(debit) - BigInt(credit)).toString()) }} 원</strong
                  ></span
                >
              </div>

              <div class="editor-actions">
                <span v-if="pagesPreview">입력한 내용은 현재 탭에서만 볼 수 있습니다.</span>
                <span v-else>미확정 전표로 DB에 저장합니다. 확정·마감 전표는 수정할 수 없습니다.</span>
                <UiButton
                  type="submit"
                  variant="primary"
                  :disabled="pagesPreview || busy || loading || !meta || locked"
                  >저장</UiButton
                >
              </div>
            </fieldset>
          </form>
        </section>
      </div>
      <aside v-show="detailOpen" id="sales-detail" class="sales-aside" aria-label="입력 도움말">
        <section class="sales-card">
          <h2><UiIcon name="help" :size="18" /> 입력 안내</h2>
          <p>상단에서 전표를 조회하고 아래 입력 영역에서 신규 등록 또는 수정을 진행하세요.</p>
          <dl>
            <dt>회계기간</dt>
            <dd>{{ currentPeriod?.start }} ~ {{ currentPeriod?.end }}</dd>
            <dt>작성자</dt>
            <dd>{{ pagesPreview ? meta?.user : '개발 관리자' }}</dd>
            <dt>저장 위치</dt>
            <dd>{{ pagesPreview ? '샘플 데이터 미리보기' : `${meta?.company ?? ''} · PostgreSQL` }}</dd>
          </dl>
        </section>
        <section class="sales-card">
          <h2>입력 기준</h2>
          <p>지원 거래유형은 11 매출 과세, 51 매입 과세입니다.</p>
          <p>공급가액과 부가세는 원 단위 정수로 입력하며 합계만 자동 표시합니다.</p>
          <p>
            11·51 유형의 부가세 0원은 서버에서 확인요망으로 판정합니다. 확인 체크 후 저장하면 확인
            시점과 작성자를 기록합니다.
          </p>
        </section>
        <section class="sales-card shortcut-card">
          <h2>빠른 입력</h2>
          <p><kbd>F2</kbd> 거래처 입력 중 검색</p>
          <p><kbd>Tab</kbd> 다음 입력 항목으로 이동</p>
        </section>
      </aside>
    </div>
    <SearchDialog
      :open="searchOpen"
      :items="partners"
      @close="searchOpen = false"
      @select="partnerSelected"
    />
    <ConfirmDialog
      :open="!!pending"
      @cancel="pending = null"
      @confirm="confirmPending"
    />
    <ConfirmDialog
      :open="deleting"
      title="전표를 삭제할까요?"
      message="선택한 미확정 전표와 분개가 DB에서 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
      confirm-label="삭제"
      @cancel="deleting = false"
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.entry-fields {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.error-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff1f2;
  color: #b91c1c;
  padding: 14px;
  margin-bottom: 16px;
  border-radius: 8px;
}
.vat-confirm {
  display: flex;
  gap: 8px;
  margin: 0 20px 16px;
  padding: 12px;
  background: #edf3ff;
  color: #2457c5;
  font-size: 12px;
}
.review-label {
  display: block;
  font-size: 10px;
  margin-top: 4px;
}
.sales-journal {
  min-width: 0;
}
.context-notice {
  display: flex;
  gap: 10px;
  align-items: center;
  background: #edf3ff;
  color: #45628f;
  border: 1px solid #dbe7fa;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 12px;
  line-height: 1.7;
}
.result-notice {
  background: #ecfdf5;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  color: #166534;
}
.sales-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 24%);
  gap: 20px;
  align-items: start;
}
.sales-main {
  min-width: 0;
  display: grid;
  gap: 20px;
}
.sales-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.type-tabs {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding: 0 18px;
  gap: 22px;
}
.type-tabs button {
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  padding: 16px 2px;
  color: var(--secondary);
  font-weight: 600;
}
.type-tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.type-tabs > span {
  margin-left: auto;
  font-size: 11px;
  color: var(--secondary);
}
.sales-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  flex-wrap: wrap;
  background: #fafbfd;
}
.sales-filters label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 12px;
}
.sales-filters input[type='date'] {
  width: 145px;
}
.sales-search {
  flex: 1;
  min-width: 160px;
}
.sales-grid-scroll {
  overflow: auto;
}
.sales-grid {
  border-collapse: collapse;
  width: 100%;
  white-space: nowrap;
  font-size: 12px;
}
.sales-grid th {
  background: #f4f6fa;
  font-weight: 500;
  color: #66758b;
  padding: 12px 10px;
  text-align: left;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.sales-grid td {
  padding: 14px 10px;
  border-bottom: 1px solid #edf0f5;
}
.sales-grid .numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.sales-grid tbody tr:hover {
  background: #f5f8ff;
}
.sales-grid tbody tr.selected {
  background: #eaf2ff;
  box-shadow: inset 3px 0 var(--primary);
}
.sales-grid tbody tr {
  cursor: pointer;
}
.sales-grid .partner-cell {
  font-weight: 600;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.code {
  color: var(--secondary);
}
.type-label {
  color: #2457c5;
  background: #edf3ff;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 11px;
}
.type-label.purchase {
  color: #8a55b0;
  background: #f4ecfc;
}
.zero-vat {
  color: var(--primary);
  font-weight: 600;
}
.total-cell {
  font-weight: 600;
}
.sales-grid tfoot td {
  background: #edf3ff;
  color: #244b8c;
  font-weight: 600;
  border-top: 1px solid #d4e2fa;
}
.sales-grid tfoot span {
  margin-left: 10px;
  font-weight: 400;
  font-size: 11px;
}
.sales-grid .empty-cell {
  text-align: center;
  padding: 32px 16px;
  color: var(--secondary);
  white-space: normal;
}
.list-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  color: var(--secondary);
  font-size: 11px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}
.section-heading h2 {
  font-size: 15px;
}
.sales-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding: 20px;
}
.sales-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 0;
}
.sales-form .wide {
  grid-column: span 2;
}
.partner-input {
  display: flex;
  gap: 6px;
}
.partner-input .input {
  min-width: 0;
  width: 100%;
}
.memo-field {
  grid-column: span 3;
}
.amount-output {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 36px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #edf3ff;
  color: var(--primary);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.amount-output small {
  font-size: 11px;
  font-weight: 400;
}
.field-error {
  color: var(--danger);
  font-size: 11px;
  line-height: 1.5;
}
.field-error:empty {
  display: none;
}
.journal-heading {
  border-top: 1px solid var(--border);
  border-bottom: 0;
  padding-bottom: 8px;
}
.journal-hint {
  font-size: 11px;
  color: var(--secondary);
  padding: 0 20px 16px;
}
.line-grid {
  min-width: 600px;
}
.line-grid td {
  padding: 8px;
}
.line-grid td:first-child {
  width: 110px;
}
.line-grid td:last-child {
  width: 50px;
}
.line-grid .input {
  width: 100%;
  min-width: 0;
}
.journal-totals {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 24px;
  background: #f8fafc;
  padding: 16px 20px;
  font-size: 12px;
}
.journal-totals strong {
  margin-left: 10px;
}
.editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
  border-top: 1px solid var(--border);
}
.editor-actions > span {
  color: var(--secondary);
  font-size: 11px;
}
.sales-aside {
  display: grid;
  gap: 16px;
}
.sales-aside .sales-card {
  padding: 18px;
}
.sales-aside h2 {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.sales-aside p {
  font-size: 12px;
  color: var(--secondary);
  line-height: 1.9;
  margin-bottom: 12px;
}
.sales-aside p:last-child {
  margin-bottom: 0;
}
.sales-aside dl {
  font-size: 11px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  margin-bottom: 0;
}
.sales-aside dt {
  color: var(--secondary);
  margin-top: 12px;
}
.sales-aside dd {
  margin: 6px 0 0;
}
.shortcut-card kbd {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 5px;
  font-family: inherit;
  background: #f8fafc;
  margin-right: 5px;
}
.sales-layout.sales-layout-wide {
  grid-template-columns: minmax(0, 1fr);
}
@media (max-width: 1250px) {
  .sales-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .sales-aside {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 650px) {
  .sales-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 16px;
  }
  .memo-field {
    grid-column: span 2;
  }
  .sales-aside {
    grid-template-columns: 1fr;
  }
  .sales-filters {
    gap: 10px;
  }
  .sales-filters label {
    flex-wrap: wrap;
  }
  .sales-filters .sales-search {
    flex-basis: 100%;
  }
  .type-tabs {
    gap: 16px;
  }
  .editor-actions {
    flex-wrap: wrap;
  }
  .journal-totals {
    gap: 12px;
    justify-content: flex-start;
  }
}
</style>

<script setup lang="ts">
// 사업체 한 곳 — 수집 현황(화면모음 v1-1 자료수집현황) · 수집 자료(이지북스 「홈택스 매입매출 자료」) · 수집 이력(이지북스 「자료수집 이력」).
// 거래유형 · 계정과목 판정은 매입매출전표 단계의 일이라 여기서는 홈택스 원본 칸만 보인다.
import { formatAmount } from '~/utils/formatAmount'
import { useCollectedRows, useCollectionHistory } from '../composables/useCollection'
import type { collectionSession } from '../composables/useCollectionSession'
import {
  CELL_LABEL, LOGIN_TYPE_LABEL, ROW_CATEGORIES, ROW_COLUMNS, kindOf,
  type CollectedRow, type CollectionCompany, type RowColumn, type SummaryLine,
} from '../types'
import { CELL_TONE, categoryTotals, companySummary, filterHistory, halfPeriod } from '../logic'

const props = defineProps<{ company: CollectionCompany | null, session: ReturnType<typeof collectionSession> }>()
const emit = defineEmits<{ close: [], collect: [company: CollectionCompany] }>()

type Tab = 'summary' | 'rows' | 'history'
const tab = ref<Tab>('summary')
const thisYear = new Date().getFullYear()
const years = [thisYear, thisYear - 1, thisYear - 2]
const year = ref(thisYear)
const half = ref<0 | 1 | 2>(0)
const period = computed(() => halfPeriod(year.value, half.value))
const category = ref('tax')
const historyKind = ref('')
const reconcileNote = ref('')

const { data, status, error, refresh } = useCollectedRows(props.session, period)
const history = useCollectionHistory(props.session)

watch(() => props.company?.clientId, () => {
  tab.value = 'summary'
  historyKind.value = ''
  reconcileNote.value = ''
})
// 수집이 끝나 칸이 바뀌면 자료와 이력을 다시 읽는다
watch(() => props.company && JSON.stringify(Object.values(props.company.cells).map(cell => cell.status + cell.collectedAt)), (next, prev) => {
  if (prev && next !== prev) {
    void refresh()
    void history.refresh()
  }
})

const rows = computed(() => data.value?.data ?? [])

/*
 * 개발 모드 콘솔 — 업체 패널에서 받은 수집 자료를 종류별로 찍는다(운영 빌드에는 안 들어간다).
 * F12 / ⌘+⌥+J → [수집 자료] 업체 · 기간 · 종류별 건수, 펼치면 종류마다 표.
 */
watch(rows, (list) => {
  if (!import.meta.dev || !import.meta.client || !props.company || status.value !== 'success') { return }
  const sums = categoryTotals(list)
  console.groupCollapsed(`[수집 자료] ${props.company.name} · ${period.value.from} ~ ${period.value.to} · 총 ${list.length}건`)
  for (const item of ROW_CATEGORIES) {
    const own = list.filter(row => row.kind === item.type)
    const sum = sums[item.type]
    const title = `${item.flow === 'sale' ? '매출' : '매입'} ${item.label} — ${own.length}건${sum ? ` · 공급가액 ${sum.supply.toLocaleString()} · 세액 ${sum.tax.toLocaleString()} · 합계 ${sum.total.toLocaleString()}` : ''}`
    if (!own.length) {
      console.log(title)
      continue
    }
    console.groupCollapsed(title)
    console.table(own.slice(0, 300).map(row => Object.fromEntries((ROW_COLUMNS[item.type] ?? []).map(column => [column.label, row[column.field] ?? '']))))
    if (own.length > 300) { console.log(`… 외 ${own.length - 300}건`) }
    console.groupEnd()
  }
  console.groupEnd()
})
const totals = computed(() => categoryTotals(rows.value))
const empty = { count: 0, supply: 0, tax: 0, total: 0 }
const shown = computed(() => rows.value.filter(row => row.kind === category.value))
const columns = computed<RowColumn[]>(() => ROW_COLUMNS[category.value] ?? [])
const categoryLabel = computed(() => {
  const found = ROW_CATEGORIES.find(item => item.type === category.value)
  return found ? found.label + (found.flow === 'sale' ? ' 매출' : ' 매입') : ''
})
/** 판매대행 자료는 신용카드 매출 작업으로 받는다 */
const jobKindOf = (type: string) => type === 'cardagent' || type === 'etcagent' ? 'cardzero' : type
const categoryCollected = computed(() => props.company?.cells[jobKindOf(category.value)]?.status === 'done')
const cellText = (row: CollectedRow, column: RowColumn) => {
  const value = row[column.field]
  if (value === undefined || value === null || value === '') { return '—' }
  return column.num && typeof value === 'number' ? formatAmount(value) : String(value)
}

// 화면모음 v1-1 「자료수집현황」 — 매출 6종 · 매입 5종 요약. 조회를 누르면 수집 자료 탭의 그 종류로 간다.
const summary = computed(() => props.company ? companySummary(props.company, rows.value) : null)
const sides = computed(() => summary.value
  ? [
      { flow: 'sale', title: '매출항목', lines: summary.value.sale, count: summary.value.kpi.saleCount, total: summary.value.kpi.saleTotal, note: '' },
      { flow: 'purchase', title: '매입항목', lines: summary.value.purchase, count: summary.value.kpi.purchaseCount, total: summary.value.kpi.purchaseTotal, note: '(통장 제외)' },
    ]
  : [])
const lineStatus = (line: SummaryLine) => {
  if (!line.linked) { return { tone: 'neutral' as const, text: '미연동' } }
  const cell = line.cell
  if (!cell) { return { tone: 'neutral' as const, text: CELL_LABEL.none } }
  return { tone: CELL_TONE[cell.status], text: CELL_LABEL[cell.status] }
}
function lookup(line: SummaryLine) {
  if (!line.type) { return }
  category.value = line.type
  tab.value = 'rows'
}

const historyItems = computed(() => filterHistory(history.data.value?.data ?? [], historyKind.value))
const historyKinds = computed(() => [...new Set((history.data.value?.data ?? []).map(item => item.kind))])
const historyPeriod = (from: string, to: string) => from === to ? from : `${from} ~ ${to}`
const bizinfo = computed(() => props.company?.cells.bizinfo)
</script>

<template>
  <UiModal
    :open="!!company"
    :title="company ? company.name : ''"
    size="large"
    placement="right"
    @close="emit('close')"
  >
    <div
      v-if="company"
      class="rows-panel"
    >
      <div class="rows-head">
        <div>
          <span class="sub">{{ company.bizNo }} · 대표 {{ company.ceo }} · 담당 {{ company.manager || '미지정' }}</span>
          <UiBadge
            v-if="bizinfo"
            :tone="CELL_TONE[bizinfo.status]"
          >
            사업자 상태 · {{ bizinfo.status === 'done' ? bizinfo.message : CELL_LABEL[bizinfo.status] }}
          </UiBadge>
        </div>
        <div class="rows-actions">
          <UiButton
            size="small"
            variant="outline"
            @click="reconcileNote = '국세청 「부가세 신고자료 통합조회」가 아직 연동되지 않아 대사할 수 없습니다. 비교 수치를 임의로 만들지 않습니다.'"
          >
            홈택스 자료 대사
          </UiButton>
          <UiButton
            size="small"
            variant="danger"
            @click="emit('collect', company)"
          >
            자료수집
          </UiButton>
        </div>
      </div>

      <div class="pane-bar">
        <div
          class="pane-tabs"
          role="tablist"
          aria-label="보기"
        >
          <button
            v-for="item in ([['summary', '수집 현황'], ['rows', '수집 자료'], ['history', '수집 이력']] as [Tab, string][])"
            :key="item[0]"
            type="button"
            role="tab"
            :aria-selected="tab === item[0]"
            :class="{ active: tab === item[0] }"
            @click="tab = item[0]"
          >
            {{ item[1] }}
          </button>
        </div>
        <div
          v-if="tab !== 'history'"
          class="pane-period"
        >
          <select
            v-model.number="year"
            aria-label="연도"
          >
            <option
              v-for="value in years"
              :key="value"
              :value="value"
            >
              {{ value }}년
            </option>
          </select>
          <div
            class="half"
            role="group"
            aria-label="과세기간"
          >
            <button
              v-for="value in ([0, 1, 2] as const)"
              :key="value"
              type="button"
              :class="{ active: half === value }"
              :aria-pressed="half === value"
              @click="half = value"
            >
              {{ value === 0 ? '전체' : value + '기' }}
            </button>
          </div>
        </div>
      </div>

      <p
        v-if="reconcileNote"
        class="sum-note"
        role="status"
      >
        {{ reconcileNote }}
      </p>

      <LoadingState v-if="tab !== 'history' && status === 'pending' && !rows.length" />
      <ErrorState
        v-else-if="tab !== 'history' && error"
        :message="error.message"
        @retry="refresh()"
      />

      <!-- 수집 현황 -->
      <section
        v-else-if="tab === 'summary' && summary"
        class="sum"
        aria-label="자료수집 현황 요약"
      >
        <div class="sum-kpi">
          <div><span>매출 수집건수</span><b>{{ formatAmount(summary.kpi.saleCount) }}<i>건</i></b><small>6종 합산</small></div>
          <div><span>매출 수집금액</span><b>{{ formatAmount(summary.kpi.saleTotal) }}<i>원</i></b><small>6종 합산</small></div>
          <div><span>매입 수집건수</span><b>{{ formatAmount(summary.kpi.purchaseCount) }}<i>건</i></b><small>5종 합산(통장 포함)</small></div>
          <div><span>매입 수집금액</span><b>{{ formatAmount(summary.kpi.purchaseTotal) }}<i>원</i></b><small>통장 입출금 제외</small></div>
          <div class="hot">
            <span>확인필요</span><b>—</b><small>전송대기+추천확인요 · 전표 연동 후 표시</small>
          </div>
        </div>
        <div class="sum-board">
          <div
            v-for="side in sides"
            :key="side.flow"
            class="sum-side"
            :class="side.flow"
          >
            <div class="sum-cap">
              {{ side.title }}<span>총 {{ formatAmount(side.count) }}건 · {{ formatAmount(side.total) }}원{{ side.note }}</span>
            </div>
            <div class="sum-scroll">
              <table>
                <thead>
                  <tr>
                    <th>종류</th><th class="num">
                      공급가액
                    </th><th class="num">
                      세액
                    </th><th class="num">
                      합계
                    </th><th class="num">
                      건수
                    </th><th>상태</th><th />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="line in side.lines"
                    :key="line.key"
                    :class="{ off: !line.linked }"
                  >
                    <td>
                      <b>{{ line.label }}</b>
                      <small>{{ !line.linked ? '수집 경로 없음' : line.count ? `${line.dstart} ~ ${line.dend}` : '수집된 자료 없음' }}</small>
                    </td>
                    <td class="num">
                      {{ line.isBank || !line.linked ? '—' : formatAmount(line.supply) }}
                    </td>
                    <td class="num">
                      {{ line.isBank || !line.linked ? '—' : formatAmount(line.tax) }}
                    </td>
                    <td class="num">
                      {{ line.total === null || !line.linked ? '—' : formatAmount(line.total) }}
                    </td>
                    <td class="num">
                      {{ line.linked ? formatAmount(line.count) : '—' }}
                    </td>
                    <td>
                      <UiBadge :tone="lineStatus(line).tone">
                        {{ lineStatus(line).text }}
                      </UiBadge>
                    </td>
                    <td>
                      <button
                        v-if="line.linked"
                        type="button"
                        class="sum-lookup"
                        @click="lookup(line)"
                      >
                        조회
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <p class="run-help">
          결제대행 2종은 신용카드 매출 수집에 같이 옵니다(월합계). 통장은 스크랩 API 에 수집 경로가 없어 「미연동」입니다. 통장은 공급가액 · 세액 구분이 없어 입금 · 출금으로 따로 다루고 홈택스 대사 대상이 아닙니다.
        </p>
      </section>

      <!-- 수집 자료 — 이지북스 「홈택스 매입매출 자료」 -->
      <section
        v-else-if="tab === 'rows'"
        class="data"
        aria-label="수집 자료"
      >
        <nav
          class="data-cats"
          aria-label="자료 종류"
        >
          <template
            v-for="flow in (['sale', 'purchase'] as const)"
            :key="flow"
          >
            <h4>{{ flow === 'sale' ? '매출' : '매입' }}</h4>
            <button
              v-for="item in ROW_CATEGORIES.filter(row => row.flow === flow)"
              :key="item.type"
              type="button"
              :class="{ active: category === item.type, empty: !totals[item.type]?.count }"
              :aria-current="category === item.type"
              @click="category = item.type"
            >
              <span>{{ item.label }}<small>{{ formatAmount((totals[item.type] ?? empty).total) }}원</small></span>
              <b>{{ formatAmount((totals[item.type] ?? empty).count) }}</b>
            </button>
          </template>
        </nav>
        <div class="data-main">
          <h3>{{ categoryLabel }} <small>{{ period.from.replaceAll('-', '.') }} ~ {{ period.to.replaceAll('-', '.') }} · {{ formatAmount(shown.length) }}건</small></h3>
          <EmptyState
            v-if="!shown.length"
            title="수집된 자료가 없습니다"
            :description="categoryCollected ? '연도나 과세기간을 바꿔 보세요.' : '홈택스 자료수집을 먼저 실행해 주세요.'"
          />
          <div
            v-else
            class="rows-scroll"
          >
            <table class="rows-table">
              <caption class="sr-only">
                {{ company.name }} {{ categoryLabel }}
              </caption>
              <thead>
                <tr>
                  <th
                    v-for="column in columns"
                    :key="column.field + column.label"
                    :class="{ num: column.num }"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in shown"
                  :key="row.id"
                >
                  <td
                    v-for="column in columns"
                    :key="column.field + column.label"
                    :class="{ num: column.num, mono: column.field === 'date' || column.field === 'partnerBizNo', item: column.field === 'item' }"
                  >
                    {{ cellText(row, column) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="shown.length"
            class="data-foot"
          >
            <span><b>{{ formatAmount(shown.length) }}</b> (건)</span>
            <template v-if="columns.some(column => column.field === 'supply')">
              <span>공급가액 <b>{{ formatAmount(totals[category]?.supply ?? 0) }}</b></span>
              <span>세액 <b>{{ formatAmount(totals[category]?.tax ?? 0) }}</b></span>
            </template>
            <span>합계 <b>{{ formatAmount(totals[category]?.total ?? 0) }}</b></span>
          </div>
        </div>
      </section>

      <!-- 수집 이력 — 이지북스 「자료수집 이력」 -->
      <section
        v-else-if="tab === 'history'"
        class="hist"
        aria-label="자료수집 이력"
      >
        <div class="hist-head">
          <h3>자료수집 이력 <small>{{ historyItems.length }}건</small></h3>
          <select
            v-model="historyKind"
            aria-label="수집 항목"
          >
            <option value="">
              전체 항목
            </option>
            <option
              v-for="kind in historyKinds"
              :key="kind"
              :value="kind"
            >
              {{ kindOf(kind)?.label ?? kind }}
            </option>
          </select>
        </div>
        <LoadingState v-if="history.status.value === 'pending' && !historyItems.length" />
        <ErrorState
          v-else-if="history.error.value"
          :message="history.error.value.message"
          @retry="history.refresh()"
        />
        <EmptyState
          v-else-if="!historyItems.length"
          title="수집 이력이 없습니다"
          description="홈택스 자료수집을 실행하면 요청마다 한 줄씩 남습니다."
        />
        <div
          v-else
          class="rows-scroll"
        >
          <table class="rows-table hist-table">
            <thead>
              <tr>
                <th>수집 항목</th><th>조회 기간</th><th>인증</th><th>상태</th><th class="num">
                  수집 건수
                </th><th>요청자</th><th>요청 시각</th><th>완료/오류</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in historyItems"
                :key="item.id"
              >
                <td>{{ kindOf(item.kind)?.label ?? item.kind }}</td>
                <td class="mono">
                  {{ historyPeriod(item.from, item.to) }}
                </td>
                <td>{{ LOGIN_TYPE_LABEL[item.loginType] }}</td>
                <td>
                  <UiBadge :tone="CELL_TONE[item.status]">
                    {{ CELL_LABEL[item.status] }}
                  </UiBadge>
                </td>
                <td class="num">
                  {{ item.count === null ? '—' : formatAmount(item.count) }}
                </td>
                <td>{{ item.requester }}</td>
                <td class="mono">
                  {{ item.requestedAt }}
                </td>
                <td :class="item.status === 'done' ? 'mono muted' : 'hist-error'">
                  {{ item.status === 'done' ? item.finishedAt : item.message }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </UiModal>
</template>

<style scoped>
.rows-head > div:first-child { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aat-space-2); }
.pane-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--aat-space-2); border-bottom: 1px solid var(--aat-color-border); }
.pane-tabs { display: flex; gap: var(--aat-space-1); }
.pane-tabs button { padding: var(--aat-space-2) var(--aat-space-3); border: 0; border-bottom: 2px solid transparent; background: none; color: var(--aat-color-text-secondary); font: inherit; font-size: var(--aat-font-sm); font-weight: var(--aat-weight-medium); cursor: pointer; }
.pane-tabs button.active { border-bottom-color: var(--aat-color-primary); color: var(--aat-color-primary); font-weight: var(--aat-weight-semibold); }
.pane-period { display: flex; align-items: center; gap: var(--aat-space-2); padding-bottom: var(--aat-space-1); }
.pane-period select, .hist-head select { height: 30px; padding: 0 var(--aat-space-2); border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-sm); background: var(--aat-color-surface); color: var(--aat-color-text); font: inherit; font-size: var(--aat-font-sm); }
.half { display: inline-flex; padding: 2px; border-radius: var(--aat-radius-sm); background: var(--aat-color-subtle); }
.half button { min-width: 44px; padding: 4px 10px; border: 0; border-radius: var(--aat-radius-sm); background: none; color: var(--aat-color-text-secondary); font: inherit; font-size: var(--aat-font-sm); cursor: pointer; }
.half button.active { background: var(--aat-color-danger); color: #fff; font-weight: var(--aat-weight-semibold); }

.sum { display: flex; flex-direction: column; gap: var(--aat-space-3); }
.sum-kpi { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-md); background: var(--aat-color-surface); }
.sum-kpi > div { display: flex; flex-direction: column; gap: 2px; padding: var(--aat-space-2) var(--aat-space-3); border-left: 1px solid var(--aat-color-border); min-width: 0; }
.sum-kpi > div:first-child { border-left: 0; }
.sum-kpi span { font-size: var(--aat-font-xs); color: var(--aat-color-text-secondary); }
.sum-kpi b { font-size: var(--aat-font-lg); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sum-kpi b i { margin-left: 2px; font-style: normal; font-size: var(--aat-font-xs); font-weight: var(--aat-weight-medium); color: var(--aat-color-text-secondary); }
.sum-kpi small { font-size: 10.5px; color: var(--aat-color-text-secondary); }
.sum-kpi .hot { background: var(--aat-color-warning-soft, var(--aat-color-subtle)); }
.sum-kpi .hot span { color: var(--aat-color-warning); font-weight: var(--aat-weight-semibold); }
.sum-note { margin: 0; padding: var(--aat-space-2) var(--aat-space-3); border-left: 2px solid var(--aat-color-primary); background: var(--aat-color-subtle); font-size: var(--aat-font-sm); }
.sum-board { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--aat-space-3); }
.sum-side { min-width: 0; border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-md); overflow: hidden; }
.sum-scroll { overflow-x: auto; }
.sum-cap { display: flex; align-items: center; gap: var(--aat-space-2); padding: var(--aat-space-2) var(--aat-space-3); color: #fff; font-weight: var(--aat-weight-semibold); font-size: var(--aat-font-sm); background: var(--aat-color-primary); }
.sum-side.purchase .sum-cap { background: #0F7F6A; }
.sum-cap span { margin-left: auto; font-size: var(--aat-font-xs); font-weight: var(--aat-weight-medium); opacity: .92; font-variant-numeric: tabular-nums; }
.sum-side table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: var(--aat-font-xs); }
.sum-side th { padding: var(--aat-space-1) var(--aat-space-2); background: var(--aat-color-subtle); color: var(--aat-color-text-secondary); font-weight: var(--aat-weight-medium); text-align: left; white-space: nowrap; }
.sum-side td { padding: var(--aat-space-1) var(--aat-space-2); border-top: 1px solid var(--aat-color-border); white-space: nowrap; }
.sum-side .num { text-align: right; font-variant-numeric: tabular-nums; }
.sum-side td b { display: block; font-weight: var(--aat-weight-semibold); color: var(--aat-color-text); }
.sum-side td small { display: block; color: var(--aat-color-text-secondary); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.sum-side tr.off td { color: var(--aat-color-text-secondary); }
.sum-lookup { padding: 2px 8px; border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-sm); background: var(--aat-color-surface); color: var(--aat-color-text); font: inherit; cursor: pointer; }
.sum-lookup:hover { border-color: var(--aat-color-primary); color: var(--aat-color-primary); }

.data { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--aat-space-3); align-items: start; }
.data-cats { display: flex; flex-direction: column; border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-md); overflow: hidden; }
.data-cats h4 { margin: 0; padding: var(--aat-space-2) var(--aat-space-3) var(--aat-space-1); font-size: var(--aat-font-xs); color: var(--aat-color-text-secondary); background: var(--aat-color-subtle); }
.data-cats button { display: flex; align-items: center; justify-content: space-between; gap: var(--aat-space-2); padding: var(--aat-space-2) var(--aat-space-3); border: 0; border-left: 3px solid transparent; background: var(--aat-color-surface); color: var(--aat-color-text); font: inherit; font-size: var(--aat-font-sm); text-align: left; cursor: pointer; }
.data-cats button span { display: flex; flex-direction: column; }
.data-cats button small { color: var(--aat-color-text-secondary); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.data-cats button b { font-variant-numeric: tabular-nums; }
.data-cats button.empty { color: var(--aat-color-text-secondary); }
.data-cats button.active { border-left-color: var(--aat-color-primary); background: var(--aat-color-selected); font-weight: var(--aat-weight-semibold); }
.data-main { min-width: 0; display: flex; flex-direction: column; gap: var(--aat-space-2); }
.data-main h3 { margin: 0; font-size: var(--aat-font-md); }
.data-main h3 small { margin-left: var(--aat-space-1); color: var(--aat-color-text-secondary); font-weight: var(--aat-weight-medium); font-size: var(--aat-font-xs); font-variant-numeric: tabular-nums; }
.data-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--aat-space-4); padding: var(--aat-space-2) var(--aat-space-3); border-top: 1px solid var(--aat-color-border); font-size: var(--aat-font-sm); color: var(--aat-color-text-secondary); font-variant-numeric: tabular-nums; }
.data-foot b { color: var(--aat-color-text); }

/* 칸을 내용 너비로 두고 넘치면 가로로 스크롤한다 — 날짜 · 시각이 「2026-01…」로 잘리지 않게 */
.rows-table { width: max-content; min-width: 100%; }
.rows-table td:not(.item) { overflow: visible; text-overflow: clip; }

.hist { display: flex; flex-direction: column; gap: var(--aat-space-2); }
.hist-head { display: flex; align-items: center; justify-content: space-between; }
.hist-head h3 { margin: 0; font-size: var(--aat-font-md); }
.hist-head small { color: var(--aat-color-text-secondary); font-weight: var(--aat-weight-medium); }
.hist-table td { white-space: nowrap; }
.hist-table .muted { color: var(--aat-color-text-secondary); }
.hist-error { color: var(--aat-color-danger); white-space: normal !important; min-width: 220px; }

@media (max-width: 900px) {
  .sum-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sum-kpi > div { border-left: 0; border-top: 1px solid var(--aat-color-border); }
  .data { grid-template-columns: minmax(0, 1fr); }
}
</style>

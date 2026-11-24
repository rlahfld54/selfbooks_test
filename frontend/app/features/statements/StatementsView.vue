<script setup lang="ts">
import { useBackendApi } from '~/composables/useBackendApi'
import { ApiRequestError } from '~/services/api-client'
import {
  balanceSheet,
  formatAmount,
  incomeStatement,
  monthEnd,
  periodLabel,
  trialBalance,
  type LedgerBalances,
  type SheetRow,
} from './statements'

// 장부 및 재무제표 — 재무상태표 · 손익계산서 · 합계잔액시산표 (관리용)
const { clientId } = useWorkspaceContext()
const { pagesPreview } = useRuntimeConfig().public
const request = useBackendApi(20000)

// 1. 조회 조건
type Tab = 'bs' | 'is' | 'tb'
const tab = ref<Tab>('bs')
const today = new Date()
const year = ref(today.getFullYear())
const month = ref(12)
const hideZero = ref(false)
const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const range = computed(() => ({ from: `${year.value}-01-01`, to: monthEnd(year.value, month.value) }))
const priorRange = computed(() => ({ from: `${year.value - 1}-01-01`, to: `${year.value - 1}-12-31` }))

// 2. 조회
const current = ref<LedgerBalances | null>(null)
const prior = ref<LedgerBalances | null>(null)
const loading = ref(false)
const error = ref('')
let seq = 0

async function fetchRange(from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  if (clientId.value) query.set('clientId', clientId.value)
  const { data } = await request<LedgerBalances>(`/ledger/balances?${query}`)
  return data
}

async function load() {
  if (pagesPreview) {
    error.value = '미리보기에서는 실제 전표를 조회할 수 없습니다.'
    return
  }
  const my = ++seq
  loading.value = true
  error.value = ''
  try {
    const [cur, pre] = await Promise.all([
      fetchRange(range.value.from, range.value.to),
      fetchRange(priorRange.value.from, priorRange.value.to),
    ])
    if (my !== seq) return
    current.value = cur
    prior.value = pre
  }
  catch (failure) {
    if (my !== seq) return
    error.value = failure instanceof ApiRequestError ? failure.message : '재무제표를 불러오지 못했습니다.'
  }
  finally {
    if (my === seq) loading.value = false
  }
}

watch([range, () => clientId.value], () => void load(), { immediate: true })

// 3. 표
const corporate = computed(() => (current.value?.taxpayerKind ?? '').includes('법인'))
const priorRows = computed(() => (prior.value && prior.value.lines > 0 ? prior.value.rows : null))

const bs = computed(() => (current.value ? balanceSheet(current.value.rows, priorRows.value, hideZero.value) : null))
const is = computed(() => (current.value ? incomeStatement(current.value.rows, priorRows.value, corporate.value) : null))
const tb = computed(() => (current.value ? trialBalance(current.value.rows) : null))

const rows = computed<SheetRow[]>(() => {
  if (tab.value === 'bs') return bs.value?.rows ?? []
  if (tab.value === 'is') return is.value?.rows ?? []
  return tb.value?.rows ?? []
})
const balanced = computed(() => (tab.value === 'bs' ? bs.value?.balanced ?? null : tab.value === 'tb' ? tb.value?.balanced ?? null : null))
const empty = computed(() => !!current.value && current.value.lines === 0 && (prior.value?.lines ?? 0) === 0)

const currentLabel = computed(() => `당기 ${periodLabel(range.value.from, range.value.to)}`)
const priorLabel = computed(() => `전기 ${periodLabel(priorRange.value.from, priorRange.value.to)}`)

function rowClass(row: SheetRow) {
  return ['fs-row', `fs-${row.kind}`, row.indent ? `fs-indent-${row.indent}` : '', row.warn ? 'fs-warn' : '']
}
</script>

<template>
  <section class="fs-screen">
    <header class="fs-head">
      <div class="fs-tabs" role="tablist" aria-label="재무제표">
        <button type="button" role="tab" :aria-selected="tab === 'bs'" @click="tab = 'bs'">재무상태표</button>
        <button type="button" role="tab" :aria-selected="tab === 'is'" @click="tab = 'is'">손익계산서</button>
        <button type="button" role="tab" :aria-selected="tab === 'tb'" @click="tab = 'tb'">합계잔액시산표</button>
      </div>
      <span v-if="current" class="fs-client">{{ current.clientName }} · {{ current.taxpayerKind || '구분 없음' }}</span>
    </header>

    <div class="fs-filter">
      <label class="fs-field">기간
        <input v-model.number="year" type="number" min="2000" max="2100" aria-label="연도" />년
        <select v-model.number="month" aria-label="월">
          <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
        </select>월
      </label>
      <label v-if="tab === 'bs'" class="fs-check"><input v-model="hideZero" type="checkbox" />0원 계정 숨김</label>
      <button type="button" class="btn sm" :disabled="loading" @click="load">{{ loading ? '조회 중…' : '조회' }}</button>
      <span class="fs-spacer" />
      <span v-if="balanced !== null" class="fs-badge" :class="{ bad: !balanced }">{{ balanced ? '대차 일치' : '대차 불일치' }}</span>
    </div>

    <div class="fs-kinds" role="tablist" aria-label="양식">
      <button type="button" class="active">관리용</button>
      <button type="button" disabled title="통합계정·표준서식 매핑이 정해진 뒤 연결됩니다">제출용</button>
      <button type="button" disabled title="통합계정·표준서식 매핑이 정해진 뒤 연결됩니다">표준용</button>
    </div>

    <p v-if="error" class="fs-message error" role="alert">{{ error }}</p>
    <p v-else-if="empty" class="fs-message">이 기간에 전표가 없습니다. 일반전표·매입매출전표를 입력하면 여기에 집계됩니다.</p>

    <div class="fs-sheet">
      <!-- 재무상태표 · 손익계산서 -->
      <table v-if="tab !== 'tb'" class="fs-table">
        <thead>
          <tr>
            <th rowspan="2" class="fs-subject">과 목</th>
            <th colspan="2">{{ currentLabel }}</th>
            <th colspan="2">{{ priorLabel }}</th>
          </tr>
          <tr>
            <th colspan="2">금액</th>
            <th colspan="2">금액</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key" :class="rowClass(row)">
            <td class="fs-label">{{ row.label }}</td>
            <td class="fs-num">{{ formatAmount(row.values[0] ?? null) }}</td>
            <td class="fs-num">{{ formatAmount(row.values[1] ?? null) }}</td>
            <td class="fs-num">{{ formatAmount(row.values[2] ?? null) }}</td>
            <td class="fs-num">{{ formatAmount(row.values[3] ?? null) }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="5" class="fs-none">{{ loading ? '불러오는 중…' : '조회된 자료가 없습니다.' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 합계잔액시산표 -->
      <table v-else class="fs-table">
        <thead>
          <tr>
            <th colspan="2">차 변</th>
            <th rowspan="2" class="fs-subject">계 정 과 목</th>
            <th colspan="2">대 변</th>
          </tr>
          <tr>
            <th>잔액</th>
            <th>합계</th>
            <th>합계</th>
            <th>잔액</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key" :class="rowClass(row)">
            <td class="fs-num">{{ formatAmount(row.values[0] ?? null) }}</td>
            <td class="fs-num">{{ formatAmount(row.values[1] ?? null) }}</td>
            <td class="fs-label">{{ row.label }}</td>
            <td class="fs-num">{{ formatAmount(row.values[2] ?? null) }}</td>
            <td class="fs-num">{{ formatAmount(row.values[3] ?? null) }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="5" class="fs-none">{{ loading ? '불러오는 중…' : '조회된 자료가 없습니다.' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="fs-foot">
      <template v-if="tab === 'bs'">당기순이익과 마감하지 않은 전기 손익은 미처분이익잉여금에 포함됩니다. 차감계정(감가상각누계액 등)은 음수로 보입니다.</template>
      <template v-else-if="tab === 'is'">매출원가는 451~800번 계정의 발생액입니다. 상품매출원가 내역은 상품(146) 계정의 기초·매입·기말입니다.</template>
      <template v-else>합계는 기초 + 당기 발생입니다. 손익 계정은 당기 발생만 보이고, 이전 손익은 미처분이익잉여금으로 넘깁니다.</template>
      <template v-if="current"> · 당기 전표 {{ current.lines }}줄</template>
    </p>
  </section>
</template>

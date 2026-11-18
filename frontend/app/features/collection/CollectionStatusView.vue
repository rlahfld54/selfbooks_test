<script setup lang="ts">
// 자료수집 현황 — 수임 사업체 × 수집 종류 표, 홈택스 자료수집 실행, 진행 목록, 수집 자료 보기.
// 참고: 이지북스 「자료수집 집계」 · 팀장님 front-simple 자료수집현황 · 셀프북스 화면모음 자료수집.
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { collectionSession } from './composables/useCollectionSession'
import { useCollection } from './composables/useCollection'
import { CELL_TONE, filterCompanies, lastCollectedAt, statusSummary, validPeriod } from './logic'
import { CELL_LABEL, COLLECTION_KINDS, type CollectionCompany, type StartRunInput } from './types'
import CollectionRunDialog from './components/CollectionRunDialog.vue'
import CollectionProgressDock from './components/CollectionProgressDock.vue'
import CollectionRowsPanel from './components/CollectionRowsPanel.vue'
import './collection.css'

const { activeTab, company, user } = useWorkspaceContext()
const session = collectionSession(activeTab.value)
const { sample, status, companies, run, running, actionError, start, retry, cancel, refresh } = useCollection(user + ':' + company.value, session)

const managers = computed(() => [...new Set(companies.value.map(row => row.manager).filter(Boolean))].sort())
const managerOptions = computed(() => [{ value: '', label: '전체 담당자' }, ...managers.value.map(name => ({ value: name, label: name }))])
const visible = computed(() => filterCompanies(companies.value, session.query, session.manager))
const summary = computed(() => statusSummary(companies.value))
const saleKinds = COLLECTION_KINDS.filter(kind => kind.flow === 'sale')
const purchaseKinds = COLLECTION_KINDS.filter(kind => kind.flow === 'purchase')
const infoKinds = COLLECTION_KINDS.filter(kind => kind.flow === 'info')
const kinds = [...infoKinds, ...saleKinds, ...purchaseKinds]

/* 체크한 사업체만 수집할 수 있다. 체크가 없으면 보이는 사업체 전체 */
const checked = ref<string[]>([])
const allChecked = computed(() => visible.value.length > 0 && visible.value.every(row => checked.value.includes(row.clientId)))
function toggleAll(value: boolean) {
  checked.value = value ? visible.value.map(row => row.clientId) : []
}
function toggle(clientId: string, value: boolean) {
  checked.value = value ? [...new Set([...checked.value, clientId])] : checked.value.filter(id => id !== clientId)
}

const dialogOpen = ref(false)
const dialogClients = ref<string[]>([])
function openRun(only?: CollectionCompany) {
  dialogClients.value = only ? [only.clientId] : checked.value.length ? [...checked.value] : visible.value.map(row => row.clientId)
  dialogOpen.value = true
}
const starting = ref(false)
const startError = ref('')
async function startRun(input: StartRunInput) {
  starting.value = true
  startError.value = ''
  try {
    await start(input)
    dialogOpen.value = false
    checked.value = []
  }
  catch (error) {
    startError.value = (error as Error).message
  }
  finally {
    starting.value = false
  }
}

const selected = computed(() => companies.value.find(row => row.clientId === session.selectedClientId) ?? null)
const cellTitle = (row: CollectionCompany, kind: string) => {
  const cell = row.cells[kind]
  if (!cell) { return '' }
  return [CELL_LABEL[cell.status], cell.count !== null ? cell.count + '건' : '', cell.message ?? ''].filter(Boolean).join(' · ')
}
const fmtBiz = (value: string) => value.replace(/^(\d{3})(\d{2})(\d{5})$/, '$1-$2-$3')
</script>

<template>
  <div class="collection-page">
    <PageToolbar
      title="자료수집 현황"
      description="스크래핑이 끝나면 표가 저절로 새로고침됩니다. 사업체를 누르면 수집한 자료를 볼 수 있어요."
    >
      <template #eyebrow>
        DATA COLLECTION
      </template>
      <UiBadge
        v-if="sample"
        tone="warning"
      >
        샘플 데이터 · 실제 홈택스 미접속
      </UiBadge>
      <UiButton
        variant="outline"
        :loading="status.status.value === 'pending'"
        @click="refresh()"
      >
        <UiIcon
          name="arrow"
          :size="16"
        />새로고침
      </UiButton>
      <UiButton
        variant="danger"
        :disabled="!companies.length"
        @click="openRun()"
      >
        <UiIcon
          name="document"
          :size="16"
        />홈택스 자료수집
      </UiButton>
    </PageToolbar>

    <div
      class="collection-stats"
      aria-label="수집 요약"
    >
      <div class="collection-stat">
        <span>수임 사업체</span><strong>{{ summary.companies }}<small>개</small></strong>
      </div>
      <div class="collection-stat">
        <span>수집 완료</span><strong class="ok">{{ summary.done }}<small>칸</small></strong>
      </div>
      <div class="collection-stat">
        <span>수집 실패</span><strong :class="{ bad: summary.failed }">{{ summary.failed }}<small>칸</small></strong>
      </div>
      <div class="collection-stat">
        <span>한 번도 수집 안 한 사업체</span><strong :class="{ warn: summary.never }">{{ summary.never }}<small>개</small></strong>
      </div>
    </div>

    <p
      v-if="actionError"
      class="collection-alert"
      role="alert"
    >
      {{ actionError }}
    </p>

    <UiCard>
      <div class="collection-toolbar">
        <div class="search-input collection-search">
          <UiIcon
            name="search"
            :size="18"
          />
          <UiInput
            v-model="session.query"
            aria-label="사업체 검색"
            placeholder="업체명 · 사업자번호 · 대표자"
          />
        </div>
        <UiSelect
          v-model="session.manager"
          class="collection-manager"
          aria-label="담당자"
          :options="managerOptions"
        />
        <div class="collection-period">
          <span class="collection-label">조회기간</span>
          <DateRangePicker
            v-model:start="session.from"
            v-model:end="session.to"
          />
          <span
            v-if="!validPeriod(session.from, session.to)"
            class="collection-invalid"
          >기간을 확인해 주세요</span>
        </div>
        <span class="collection-count">
          {{ visible.length }}개 사업체<template v-if="checked.length"> · <b>{{ checked.length }}개 선택</b></template>
        </span>
      </div>

      <LoadingState v-if="status.status.value === 'pending' && !companies.length" />
      <ErrorState
        v-else-if="status.error.value"
        :message="status.error.value.message"
        @retry="refresh()"
      />
      <EmptyState
        v-else-if="!visible.length"
        :title="companies.length ? '조건에 맞는 사업체가 없습니다' : '수임 사업체가 없습니다'"
        :description="companies.length ? '검색어나 담당자를 바꿔 보세요.' : '수임업체관리에서 사업체를 먼저 등록해 주세요.'"
      />
      <div
        v-else
        class="collection-scroll"
      >
        <table class="collection-table">
          <caption class="sr-only">
            사업체별 자료수집 현황
          </caption>
          <thead>
            <tr>
              <th
                rowspan="2"
                class="col-check"
              >
                <input
                  type="checkbox"
                  :checked="allChecked"
                  aria-label="보이는 사업체 모두 선택"
                  @change="toggleAll(($event.target as HTMLInputElement).checked)"
                >
              </th>
              <th
                rowspan="2"
                class="col-company"
              >
                사업체
              </th>
              <th
                rowspan="2"
                class="col-manager"
              >
                담당자
              </th>
              <th
                rowspan="2"
                class="col-kind"
              >
                기본정보
              </th>
              <th
                colspan="4"
                class="group sale"
              >
                매출
              </th>
              <th
                colspan="4"
                class="group purchase"
              >
                매입
              </th>
              <th
                rowspan="2"
                class="col-action"
              >
                수집
              </th>
            </tr>
            <tr>
              <th
                v-for="kind in saleKinds"
                :key="kind.type"
                class="col-kind sale"
              >
                {{ kind.short }}
              </th>
              <th
                v-for="kind in purchaseKinds"
                :key="kind.type"
                class="col-kind purchase"
              >
                {{ kind.short }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in visible"
              :key="row.clientId"
              :class="{ selected: row.clientId === session.selectedClientId }"
              tabindex="0"
              @click="session.selectedClientId = row.clientId"
              @keydown.enter.self="session.selectedClientId = row.clientId"
            >
              <td
                class="col-check"
                @click.stop
              >
                <input
                  type="checkbox"
                  :checked="checked.includes(row.clientId)"
                  :aria-label="row.name + ' 선택'"
                  @change="toggle(row.clientId, ($event.target as HTMLInputElement).checked)"
                >
              </td>
              <td class="col-company">
                <strong>{{ row.name }}</strong>
                <span class="sub">{{ fmtBiz(row.bizNo) }} · {{ row.ceo }}</span>
                <span
                  v-if="!row.hometaxReady"
                  class="hometax-missing"
                >홈택스 정보 없음</span>
              </td>
              <td class="col-manager">
                {{ row.manager || '미지정' }}
              </td>
              <td
                v-for="kind in kinds"
                :key="kind.type"
                class="col-kind"
                :title="cellTitle(row, kind.type)"
              >
                <template v-if="row.cells[kind.type]">
                  <UiBadge
                    :tone="CELL_TONE[row.cells[kind.type]!.status]"
                    :class="'cell-' + row.cells[kind.type]!.status"
                  >
                    <span
                      v-if="row.cells[kind.type]!.status === 'running'"
                      class="cell-spinner"
                      aria-hidden="true"
                    />
                    {{ CELL_LABEL[row.cells[kind.type]!.status] }}
                  </UiBadge>
                  <span class="cell-date">{{ row.cells[kind.type]!.collectedAt ?? '—' }}</span>
                </template>
              </td>
              <td
                class="col-action"
                @click.stop
              >
                <UiButton
                  size="small"
                  variant="outline"
                  :disabled="running && run?.items.some(item => item.clientId === row.clientId && (item.status === 'running' || item.status === 'waiting'))"
                  @click="openRun(row)"
                >
                  수집
                </UiButton>
                <span class="cell-date">{{ lastCollectedAt(row) ?? '기록 없음' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="collection-legend">
        <span><i class="dot done" />완료</span><span><i class="dot failed" />실패</span><span><i class="dot skipped" />건너뜀 — 권한 부족 · 이전 인증 실패</span><span><i class="dot none" />미수집 · 중단됨</span>
        <span class="legend-note">홈택스 비밀번호 오류는 계정 잠금을 막으려고 자동으로 다시 시도하지 않습니다.</span>
      </p>
    </UiCard>

    <CollectionRunDialog
      :open="dialogOpen"
      :companies="companies"
      :initial-clients="dialogClients"
      :starting="starting"
      :error="startError"
      @close="dialogOpen = false"
      @start="startRun"
    />

    <CollectionRowsPanel
      :company="selected"
      :session="session"
      @close="session.selectedClientId = ''"
      @collect="openRun"
    />

    <CollectionProgressDock
      v-if="session.dockOpen && run"
      :run="run"
      :hidden="session.hidden"
      :minimized="session.dockMinimized"
      @retry="retry"
      @cancel="cancel"
      @hide="session.hidden.push($event)"
      @minimize="session.dockMinimized = !session.dockMinimized"
      @close="session.dockOpen = false"
    />
  </div>
</template>

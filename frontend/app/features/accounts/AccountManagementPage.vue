<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountCategoryTree from './components/AccountCategoryTree.vue'
import AccountTable from './components/AccountTable.vue'
import SummaryTable from './components/SummaryTable.vue'
import AccountFields from './components/AccountFields.vue'
import SummaryFields from './components/SummaryFields.vue'
import AccountDetailPanel from './components/AccountDetailPanel.vue'
import { useAccountManagement } from './useAccountManagement'
import { validateAccount, validateSummary } from './logic'
import type { MockAccount, MockSummary } from './types'
import './accounts.css'
import './accounts-page-refined.css'

// 기존 데이터/업무 로직은 한 곳에서 관리합니다.
const {
  state: s,
  dirty,
  rows,
  selected,
  summaries,
  editAccount,
  editSummary,
  reset,
  loading,
  loadError,
  preview,
  summaryAccounts,
} = useAccountManagement()

type ListMode = 'summaries' | 'accounts'
type ConfirmAction = {
  title: string
  message: string
  label: string
  action: () => void
}

const listMode = ref<ListMode>('summaries')
const selectedSummaryId = ref<number | null>(null)
const error = ref('')
const notice = ref('')
const confirmation = ref<ConfirmAction | null>(null)

const activeAccountCount = computed(() => s.accounts.filter((account) => account.isActive).length)
const isSummaryList = computed(() => s.section === 'summaries' || listMode.value === 'summaries')
const selectedAccountIds = computed(() =>
  s.checked.length > 0 ? [...s.checked] : s.selectedId == null ? [] : [s.selectedId],
)
const hasDeleteTarget = computed(() =>
  isSummaryList.value ? selectedSummaryId.value !== null : selectedAccountIds.value.length > 0,
)
const visibleCount = computed(() =>
  listMode.value === 'summaries' ? transactionRows.value.length : rows.value.length,
)

const accountStatusOptions = [
  { value: '', label: '사용여부 전체' },
  { value: 'true', label: '사용' },
  { value: 'false', label: '미사용' },
]
const summarySideOptions = [
  { value: '', label: '차변/대변 전체' },
  { value: 'DEBIT', label: '차변' },
  { value: 'CREDIT', label: '대변' },
  { value: 'UNKNOWN', label: '미확정' },
]
const summaryFixedOptions = [
  { value: '', label: '고정/일반 전체' },
  { value: 'true', label: '고정' },
  { value: 'false', label: '일반' },
]

// 필터용 조회 맵을 한 번만 만들고 적요 행마다 재검색하지 않습니다.
const accountById = computed(
  () => new Map(summaryAccounts.value.map((account) => [account.id, account])),
)
const transactionRows = computed(() => {
  const allowedIds = new Set(
    summaryAccounts.value
      .filter(
        (account) =>
          (!s.category || account.category === s.category) &&
          (!s.subcategory || account.subcategory === s.subcategory) &&
          (!s.active || String(account.isActive) === s.active),
      )
      .map((account) => account.id),
  )
  const query = s.query.trim().toLowerCase()

  return s.summaries.filter((row) => {
    if (!allowedIds.has(row.accountId)) return false
    if (!query) return true

    const account = accountById.value.get(row.accountId)
    return [row.code, row.name, account?.code, account?.name]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
})

const linkedSummaries = computed(() =>
  s.summaries.filter((row) => row.accountId === selected.value?.id),
)
const accountOptions = computed(() => [
  { value: '', label: '모든 계정과목' },
  ...summaryAccounts.value.map((account) => ({
    value: String(account.id),
    label: `${account.code} ${account.name}`,
  })),
])
const editingSummary = computed(() => s.summaries.find((row) => row.id === s.summaryDraft?.id))

function discardDraft() {
  s.accountDraft = null
  s.summaryDraft = null
  error.value = ''
}

function requestConfirmation(options: ConfirmAction) {
  confirmation.value = options
}

function guard(action: () => void) {
  if (loading.value) return

  if (!dirty.value) {
    discardDraft()
    action()
    return
  }

  requestConfirmation({
    title: '미저장 변경사항',
    message: '입력 중인 변경사항을 버리고 계속할까요?',
    label: '버리고 계속',
    action: () => {
      discardDraft()
      action()
    },
  })
}

function cancelEdit() {
  guard(() => {})
}

function confirm() {
  const action = confirmation.value?.action
  confirmation.value = null
  action?.()
}

function changeSection(section: 'accounts' | 'summaries') {
  if (s.section === section) return
  guard(() => {
    s.section = section
  })
}

function changeListMode(mode: ListMode) {
  if (listMode.value === mode) return
  guard(() => {
    listMode.value = mode
  })
}

function changeCategory(category: string, subcategory: string) {
  guard(() => {
    s.category = category
    s.subcategory = subcategory
  })
}

function selectAccount(id: number) {
  guard(() => {
    s.selectedId = id
    selectedSummaryId.value = null
  })
}

function selectSummary(row: MockSummary) {
  guard(() => {
    s.selectedId = row.accountId
    selectedSummaryId.value = row.id
  })
}

function closeDetail() {
  guard(() => {
    s.selectedId = null
    selectedSummaryId.value = null
  })
}

function sortAccounts(key: keyof MockAccount) {
  s.descending = s.sort === key ? !s.descending : false
  s.sort = key
}

function startAddingAccount() {
  guard(() => editAccount())
}

function startEditingAccount() {
  const account = selected.value
  if (!account) return
  guard(() => {
    editAccount(account)
    s.detailTab = '기본정보'
  })
}

function openSummary(value?: MockSummary) {
  guard(() => editSummary(value))
}

function saveAccount() {
  if (!s.accountDraft) return
  error.value = validateAccount(s.accountDraft, s.accounts)
  if (error.value) return

  const value = {
    ...s.accountDraft,
    code: s.accountDraft.code.trim(),
    name: s.accountDraft.name.trim(),
    displayName: s.accountDraft.displayName.trim(),
  }
  const index = s.accounts.findIndex((account) => account.id === value.id)

  if (index < 0) {
    s.accounts.push(value)
    s.query = ''
    s.category = ''
    s.subcategory = ''
    s.active = ''
  } else {
    s.accounts[index] = value
  }

  // 기존 composable의 두 계정 배열 동기화 방식을 유지합니다.
  // 새 계정 추가 시 summaryAccounts로의 전파는 useAccountManagement 구현 확인 필요.
  s.summaryAccounts = s.summaryAccounts.map((account) =>
    account.id === value.id ? { ...account, ...value } : account,
  )
  s.selectedId = value.id
  discardDraft()
  notice.value = '계정과목을 화면에 반영했습니다.'
}

function saveSummary() {
  if (!s.summaryDraft) return
  error.value = validateSummary(s.summaryDraft, s.summaries, summaryAccounts.value)
  if (error.value) return

  const value = {
    ...s.summaryDraft,
    code: s.summaryDraft.code.trim(),
    name: s.summaryDraft.name.trim(),
  }
  const index = s.summaries.findIndex((row) => row.id === value.id)
  if (index < 0) s.summaries.push(value)
  else s.summaries[index] = value

  selectedSummaryId.value = value.id
  s.selectedId = value.accountId
  discardDraft()
  notice.value = '적요를 화면에 반영했습니다.'
}

function removeSummary(summary: MockSummary) {
  requestConfirmation({
    title: '적요 삭제',
    message: `${summary.code} ${summary.name} 적요를 삭제할까요?`,
    label: '삭제',
    action: () => {
      s.summaries = s.summaries.filter((row) => row.id !== summary.id)
      if (selectedSummaryId.value === summary.id) selectedSummaryId.value = null
      notice.value = '적요를 삭제했습니다.'
    },
  })
}

function removeSelected() {
  if (isSummaryList.value) {
    const summary = s.summaries.find((row) => row.id === selectedSummaryId.value)
    if (summary) removeSummary(summary)
    else notice.value = '삭제할 거래적요를 먼저 선택하세요.'
    return
  }

  const ids = selectedAccountIds.value
  if (!ids.length) {
    notice.value = '삭제할 계정과목을 먼저 선택하세요.'
    return
  }
  if (s.accounts.some((account) => ids.includes(account.id) && account.isLocked)) {
    notice.value = '표준 잠금 계정과목은 삭제할 수 없습니다. 사용여부를 변경해 주세요.'
    return
  }
  if (s.summaries.some((row) => ids.includes(row.accountId))) {
    notice.value = '연결된 적요를 먼저 삭제하거나 다른 계정과목으로 변경해 주세요.'
    return
  }

  requestConfirmation({
    title: '계정과목 삭제',
    message: `${ids.length}개 계정과목을 현재 작업에서 삭제할까요?`,
    label: '삭제',
    action: () => {
      s.accounts = s.accounts.filter((account) => !ids.includes(account.id))
      s.summaryAccounts = s.summaryAccounts.filter((account) => !ids.includes(account.id))
      s.checked = []
      s.selectedId = null
      selectedSummaryId.value = null
      notice.value = '선택한 계정과목을 삭제했습니다.'
    },
  })
}

function reload(defaults = false) {
  requestConfirmation({
    title: defaults ? '기본 계정과목 불러오기' : '기본 계정과목 새로고침',
    message:
      '화면에서 변경한 계정과목과 적요를 지우고 기본 계정과목을 다시 불러옵니다. 계속할까요?',
    label: '다시 불러오기',
    action: () => {
      void reset().then((ok) => {
        if (!ok) return
        error.value = ''
        selectedSummaryId.value = null
        notice.value = '기본 계정과목을 불러왔습니다.'
      })
    },
  })
}
</script>

<template>
  <section class="am-page am-managed">
    <PageToolbar>
      <UiButton type="button" :disabled="loading" @click="reload(true)">
        기본 계정과목 불러오기
      </UiButton>
      <UiButton type="button" :loading="loading" @click="reload()">새로고침</UiButton>
      <UiButton
        v-if="s.section === 'accounts'"
        type="button"
        :disabled="loading || !s.loaded"
        @click="startAddingAccount">
        + 계정과목 추가
      </UiButton>
      <UiButton
        v-if="isSummaryList"
        type="button"
        variant="primary"
        :disabled="loading || !s.accounts.length"
        @click="openSummary()">
        + 적요 추가
      </UiButton>
      <template #delete>
        <UiButton
          type="button"
          :disabled="loading || !hasDeleteTarget"
          @click="guard(removeSelected)">
          삭제
        </UiButton>
      </template>
    </PageToolbar>

    <header class="am-intro am-refined-intro">
      <div>
        <h1>계정별 적요 페이지리</h1>
      </div>
      <span class="am-status">{{ preview ? '참고자료 미리보기' : '기준정보 조회' }}</span>
    </header>

    <div class="am-refined-overview" aria-label="기준정보 현황">
      <div class="am-refined-metric">
        <span>전체 계정과목</span>
        <strong>{{ s.accounts.length.toLocaleString() }}</strong>
      </div>
      <div class="am-refined-metric">
        <span>사용 중 계정</span>
        <strong>{{ activeAccountCount.toLocaleString() }}</strong>
      </div>
      <div class="am-refined-metric">
        <span>전체 적요</span>
        <strong>{{ s.summaries.length.toLocaleString() }}</strong>
      </div>
      <p class="am-refined-session-note">
        현재 세션에만 변경 내용이 반영됩니다. 다시 불러오면 초기화됩니다.
      </p>
    </div>

    <p v-if="notice" class="am-notice" role="status">{{ notice }}</p>
    <div v-if="loadError" class="am-load-error" role="alert">
      {{ loadError }}
      <UiButton type="button" :disabled="loading" @click="reload()">다시 불러오기</UiButton>
    </div>
    <p v-if="loading" role="status" class="am-help">기본 계정과목을 불러오는 중입니다.</p>

    <fieldset class="am-content" :disabled="loading" :aria-busy="loading">
      <nav class="am-tabs" aria-label="관리 화면">
        <button
          type="button"
          :class="{ active: s.section === 'accounts' }"
          :aria-pressed="s.section === 'accounts'"
          @click="changeSection('accounts')">
          계정과목 관리
          <span>{{ s.accounts.length }}</span>
        </button>
        <button
          type="button"
          :class="{ active: s.section === 'summaries' }"
          :aria-pressed="s.section === 'summaries'"
          @click="changeSection('summaries')">
          적요 전체관리
          <span>{{ s.summaries.length }}</span>
        </button>
      </nav>

      <div v-if="s.section === 'accounts'" class="am-workspace has-detail am-refined-workspace">
        <AccountCategoryTree
          :accounts="summaryAccounts"
          :category="s.category"
          :subcategory="s.subcategory"
          @select="changeCategory" />

        <section class="am-list am-refined-list" aria-label="계정과목 목록">
          <div class="am-toolbar am-refined-filterbar">
            <UiInput
              v-model="s.query"
              aria-label="계정코드 또는 계정과목명 검색"
              placeholder="적요·계정과목 코드 또는 이름 검색" />
            <UiSelect
              v-model="s.active"
              aria-label="계정과목 사용여부"
              :options="accountStatusOptions" />
          </div>

          <div class="am-refined-list-heading">
            <div class="am-list-meta">
              {{ s.subcategory || s.category || '전체 계정과목' }} ·
              <strong>{{ visibleCount }}</strong>
              개
              <span v-if="listMode === 'accounts' && s.checked.length">
                / {{ s.checked.length }}개 선택
              </span>
            </div>
            <UiButton
              type="button"
              size="small"
              :aria-pressed="s.compact"
              @click="s.compact = !s.compact">
              {{ s.compact ? '압축' : '기본' }} 밀도
            </UiButton>
          </div>

          <div class="am-view-switch" role="group" aria-label="목록 표시 기준">
            <button
              type="button"
              :aria-pressed="listMode === 'summaries'"
              @click="changeListMode('summaries')">
              거래적요 기준
            </button>
            <button
              type="button"
              :aria-pressed="listMode === 'accounts'"
              @click="changeListMode('accounts')">
              전체 계정과목
            </button>
          </div>

          <SummaryTable
            v-if="listMode === 'summaries'"
            :rows="transactionRows"
            :accounts="summaryAccounts"
            :selected-id="selectedSummaryId"
            :compact="s.compact"
            @select="selectSummary"
            @edit="openSummary"
            @delete="removeSummary" />
          <AccountTable
            v-else
            :rows="rows"
            :selected-id="s.selectedId"
            :checked="s.checked"
            :compact="s.compact"
            :sort="s.sort"
            :descending="s.descending"
            @select="selectAccount"
            @check="s.checked = $event"
            @sort="sortAccounts" />
          <p class="am-list-meta am-refined-hint">
            행을 선택하면 오른쪽에서 계정과목 정보와 연결된 적요를 확인할 수 있습니다.
          </p>
        </section>

        <AccountDetailPanel
          v-model:draft="s.accountDraft"
          :account="selected"
          :accounts="s.accounts"
          :linked="linkedSummaries"
          :adding-account="s.addingAccount"
          :error="error"
          @edit-account="startEditingAccount"
          @close="closeDetail"
          @save-account="saveAccount"
          @cancel-edit="cancelEdit"
          @add-summary="openSummary()"
          @edit-summary="openSummary"
          @delete-summary="removeSummary" />
      </div>

      <section v-else class="am-summary-page am-refined-summary-page">
        <div class="am-refined-summary-intro">
          <div>
            <h2>적요 전체관리</h2>
            <p class="am-list-meta">
              {{ s.summaryClientName ? `${s.summaryClientName} · 실제 적요` : '적요 조회' }} ·
              거래요소 1~4는 차변, 5~8은 대변으로 분류합니다.
            </p>
          </div>
          <strong>조회 {{ summaries.length.toLocaleString() }}건</strong>
        </div>
        <div v-if="s.summaryLoadError" class="am-load-error" role="alert">
          {{ s.summaryLoadError }}
          <UiButton type="button" @click="reload()">다시 불러오기</UiButton>
        </div>
        <div class="am-toolbar am-refined-summary-filters">
          <UiInput
            v-model="s.summaryQuery"
            aria-label="적요 검색"
            placeholder="적요코드 또는 적요명 검색" />
          <UiSelect
            v-model="s.summaryAccount"
            aria-label="계정과목 필터"
            :options="accountOptions" />
          <UiSelect
            v-model="s.summarySide"
            aria-label="차변 대변 필터"
            :options="summarySideOptions" />
          <UiSelect
            v-model="s.summaryFixed"
            aria-label="고정적요 필터"
            :options="summaryFixedOptions" />
        </div>
        <SummaryTable
          :rows="summaries"
          :accounts="summaryAccounts"
          :selected-id="selectedSummaryId"
          @select="selectSummary"
          @edit="openSummary"
          @delete="removeSummary" />
      </section>
    </fieldset>

    <UiModal
      :open="Boolean(s.accountDraft && s.addingAccount)"
      title="계정과목 추가"
      @close="cancelEdit">
      <form v-if="s.accountDraft && s.addingAccount" class="am-page" @submit.prevent="saveAccount">
        <AccountFields v-model="s.accountDraft" :accounts="s.accounts" />
        <p v-if="error" class="am-error" role="alert">{{ error }}</p>
        <div class="am-form-footer">
          <UiButton type="button" @click="cancelEdit">취소</UiButton>
          <UiButton type="submit" variant="primary">화면에 추가</UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal
      :open="Boolean(s.summaryDraft)"
      :title="editingSummary ? '적요 수정' : '적요 추가'"
      @close="cancelEdit">
      <form v-if="s.summaryDraft" class="am-page" @submit.prevent="saveSummary">
        <SummaryFields
          v-model="s.summaryDraft"
          :accounts="summaryAccounts"
          :original="editingSummary" />
        <p v-if="error" class="am-error" role="alert">{{ error }}</p>
        <div class="am-form-footer">
          <UiButton type="button" @click="cancelEdit">취소</UiButton>
          <UiButton type="submit" variant="primary">저장</UiButton>
        </div>
      </form>
    </UiModal>

    <ConfirmDialog
      :open="Boolean(confirmation)"
      :title="confirmation?.title"
      :message="confirmation?.message"
      :confirm-label="confirmation?.label"
      @confirm="confirm"
      @cancel="confirmation = null" />
  </section>
</template>

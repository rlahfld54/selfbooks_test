<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AccountCategoryTree from './components/AccountCategoryTree.vue'
import { useAccountPreferences } from './useAccountPreferences'
import SummaryTable from './components/SummaryTable.vue'
import AccountFields from './components/AccountFields.vue'
import SummaryFields from './components/SummaryFields.vue'
import AccountDetailPanel from './components/AccountDetailPanel.vue'
import { useAccountManagement } from './useAccountManagement'
import { validateAccount, validateSummary } from './logic'
import type { MockSummary } from './types'

// 기존 데이터/업무 로직은 한 곳에서 관리합니다.
const {
  state: s,
  dirty,
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

type ConfirmAction = {
  title: string
  message: string
  label: string
  action: () => void
}

const { preferences } = useAccountPreferences()
const categoryHovered = ref(false)
const categoryPinned = ref(false)
const selectedSummaryId = ref<number | null>(null)
const selectedSummary = computed(() =>
  s.summaries.find((row) => row.id === selectedSummaryId.value),
)
watch(selectedSummary, (row) => {
  if (row) s.selectedId = row.accountId
})
const error = ref('')
const notice = ref('')
const confirmation = ref<ConfirmAction | null>(null)

const activeAccountCount = computed(() => s.accounts.filter((account) => account.isActive).length)
const isSummaryList = computed(() => true)
const selectedAccountIds = computed(() =>
  s.checked.length > 0 ? [...s.checked] : s.selectedId == null ? [] : [s.selectedId],
)
const hasDeleteTarget = computed(() =>
  isSummaryList.value ? selectedSummaryId.value !== null : selectedAccountIds.value.length > 0,
)
const transactionRows = computed(() => {
  const allowed = new Set(
    summaryAccounts.value
      .filter(
        (a) =>
          (s.category === 'special'
            ? Number(a.code) >= 1000 && Number(a.code) <= 1010
            : !s.category || a.category === s.category) &&
          (!s.subcategory || a.subcategory === s.subcategory) &&
          (!s.active || String(a.isActive) === s.active),
      )
      .map((a) => a.id),
  )
  const map = new Map(summaryAccounts.value.map((a) => [a.id, a]))
  return summaries.value.filter(
    (row) =>
      allowed.has(row.accountId) &&
      [row.code, row.name, map.get(row.accountId)?.code, map.get(row.accountId)?.name]
        .join(' ')
        .toLowerCase()
        .includes(s.query.trim().toLowerCase()),
  )
})
watch(
  () => s.summaries,
  (rows) => {
    if (!rows.some((row) => row.id === selectedSummaryId.value)) {
      selectedSummaryId.value = rows[0]?.id ?? null
      s.selectedId = rows[0]?.accountId ?? null
    }
  },
  { immediate: true },
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

function changeCategory(category: string, subcategory: string) {
  guard(() => {
    s.category = category
    s.subcategory = subcategory
  })
}

function selectSummary(row: MockSummary) {
  guard(() => {
    s.selectedId = row.accountId
    selectedSummaryId.value = row.id
  })
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
  // 신규 계정은 composable의 병합을 통해 적요 연결 선택지에 포함됩니다.
  s.summaryAccounts = s.summaryAccounts.map((account) =>
    account.id === value.id ? { ...account, ...value } : account,
  )
  s.selectedId = selectedSummary.value?.accountId ?? null
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
        selectedSummaryId.value = s.summaries[0]?.id ?? null
        notice.value = '기본 계정과목을 불러왔습니다.'
      })
    },
  })
}
</script>

<template>
  <section class="am-page am-managed">
    <div class="am-commandbar">
      <h1>계정별 적요 페이지</h1>
      <PageToolbar>
        <UiButton type="button" :disabled="loading" @click="reload(true)">
          기본 계정과목 불러오기
        </UiButton>
        <UiButton type="button" :loading="loading" @click="reload()">새로고침</UiButton>
        <UiButton type="button" :disabled="loading || !s.loaded" @click="startAddingAccount">
          + 계정과목 추가
        </UiButton>
        <UiButton
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
    </div>

    <div class="am-refined-overview" aria-label="기준정보 현황">
      <div class="am-refined-metric">
        <span>전체 계정과목</span>
        <strong>{{ s.accounts.length.toLocaleString() }}</strong>
      </div>
      <div class="am-refined-metric">
        <span>사용 설정 계정</span>
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
      <div class="am-workspace am-refined-workspace">
        <div
          class="am-category-overlay"
          :class="{ expanded: categoryHovered || categoryPinned }"
          @mouseenter="categoryHovered = true"
          @mouseleave="categoryHovered = false">
          <button
            class="am-category-toggle"
            type="button"
            aria-label="카테고리 고정"
            :aria-pressed="categoryPinned"
            :aria-expanded="categoryHovered || categoryPinned"
            @click="categoryPinned = !categoryPinned">
            ☷
            <span v-if="categoryHovered || categoryPinned">
              카테고리 {{ categoryPinned ? '고정 해제' : '고정' }}
            </span>
          </button>
          <AccountCategoryTree
            v-show="categoryHovered || categoryPinned"
            :accounts="summaryAccounts"
            :category="s.category"
            :subcategory="s.subcategory"
            @select="changeCategory" />
        </div>
        <section class="am-list am-refined-list" aria-label="거래적요 목록">
          <div class="am-toolbar am-refined-filterbar">
            <UiInput
              v-model="s.query"
              aria-label="거래적요 검색"
              placeholder="적요·계정과목 코드 또는 이름 검색" />
            <UiSelect
              v-model="s.active"
              aria-label="계정과목 사용여부"
              :options="accountStatusOptions" />
          </div>
          <div class="am-toolbar am-refined-filterbar">
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
          <div class="am-refined-list-heading">
            <span class="am-list-meta">
              {{
                s.subcategory ||
                (s.category === 'special' ? '특수설정계정과목' : s.category) ||
                '전체'
              }}
              · {{ transactionRows.length }}건
            </span>
            <UiButton
              size="small"
              :aria-pressed="preferences.compact"
              @click="preferences.compact = !preferences.compact">
              {{ preferences.compact ? '압축' : '기본' }} 밀도
            </UiButton>
          </div>
          <p class="am-help am-refined-hint">
            <label>
              <input type="checkbox" disabled />
              사용중만
            </label>
            — 전표 사용 이력 미연결
          </p>
          <p v-if="s.summaryLoadError" class="am-error" role="alert">{{ s.summaryLoadError }}</p>
          <SummaryTable
            v-model:columns="preferences.columns"
            :rows="transactionRows"
            :accounts="summaryAccounts"
            :selected-id="selectedSummaryId"
            :compact="preferences.compact"
            @select="selectSummary"
            @edit="openSummary"
            @delete="removeSummary" />
        </section>
        <AccountDetailPanel
          v-model:draft="s.accountDraft"
          v-model:matrix="preferences.matrix"
          :summary="selectedSummary"
          :account="selectedSummary ? selected : null"
          :accounts="summaryAccounts"
          :linked="linkedSummaries"
          :adding-account="s.addingAccount"
          :error="error"
          @edit-account="startEditingAccount"
          @save-account="saveAccount"
          @cancel-edit="cancelEdit"
          @add-summary="openSummary()"
          @edit-summary="openSummary"
          @delete-summary="(row) => guard(() => removeSummary(row))" />
      </div>
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

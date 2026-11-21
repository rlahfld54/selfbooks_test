<script setup lang="ts">
import { computed, ref } from 'vue'
import AccountCategoryTree from './components/AccountCategoryTree.vue'
import AccountTable from './components/AccountTable.vue'
import AccountFields from './components/AccountFields.vue'
import SummaryFields from './components/SummaryFields.vue'
import SummaryTable from './components/SummaryTable.vue'
import { useAccountManagement } from './useAccountManagement'
import { validateAccount, validateSummary } from './logic'
import { sideLabel } from './types'
import type { MockAccount, MockSummary, Side } from './types'
import './accounts.css'

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
const error = ref('')
const notice = ref('')
const confirmation = ref<{
  title: string
  message: string
  label: string
  action: () => void
} | null>(null)
const linked = computed(() => s.summaries.filter((row) => row.accountId === selected.value?.id))
const sides: (Side | 'UNKNOWN')[] = ['DEBIT', 'CREDIT', 'UNKNOWN']
function discard() {
  s.accountDraft = null
  s.summaryDraft = null
  error.value = ''
}
function guard(action: () => void) {
  if (loading.value) return
  if (dirty.value)
    confirmation.value = {
      title: '미저장 변경사항',
      message: '입력 중인 변경사항을 버리고 계속할까요?',
      label: '버리고 계속',
      action: () => {
        discard()
        action()
      },
    }
  else {
    discard()
    action()
  }
}
function confirm() {
  const action = confirmation.value?.action
  confirmation.value = null
  action?.()
}
function select(id: number) {
  guard(() => {
    s.selectedId = id
  })
}
function sort(key: keyof MockAccount) {
  s.descending = s.sort === key ? !s.descending : false
  s.sort = key
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
  const index = s.accounts.findIndex((a) => a.id === value.id)
  if (index < 0) {
    s.accounts.push(value)
    s.query = ''
    s.category = ''
    s.subcategory = ''
    s.active = ''
  } else s.accounts[index] = value
  s.selectedId = value.id
  discard()
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
  const index = s.summaries.findIndex((a) => a.id === value.id)
  if (index < 0) s.summaries.push(value)
  else s.summaries[index] = value
  discard()
  notice.value = '적요를 화면에 반영했습니다.'
}
function remove(summary: MockSummary) {
  confirmation.value = {
    title: '적요 삭제',
    message: summary.code + ' ' + summary.name + ' 적요를 삭제할까요?',
    label: '삭제',
    action: () => {
      s.summaries = s.summaries.filter((row) => row.id !== summary.id)
      notice.value = '적요를 삭제했습니다.'
    },
  }
}
function reload(defaults = false) {
  confirmation.value = {
    title: defaults ? '기본 계정과목 불러오기' : '기본 계정과목 새로고침',
    message:
      '화면에서 변경한 계정과목과 적요를 지우고 기본 계정과목을 다시 불러옵니다. 계속할까요?',
    label: '다시 불러오기',
    action: () => {
      void reset().then((ok) => {
        if (ok) {
          error.value = ''
          notice.value = '기본 계정과목을 불러왔습니다.'
        }
      })
    },
  }
}
function openSummary(value?: MockSummary) {
  guard(() => editSummary(value))
}
const accountOptions = computed(() => [
  { value: '', label: '모든 계정과목' },
  ...summaryAccounts.value.map((a) => ({ value: String(a.id), label: a.code + ' ' + a.name })),
])
const basic = computed(() =>
  selected.value
    ? [
        ['계정코드', selected.value.code],
        ['계정과목명', selected.value.name],
        ['출력용 명칭', selected.value.displayName || '—'],
        ['대분류', selected.value.category],
        ['중분류', selected.value.subcategory || '—'],
        ['계정 성격', sideLabel(selected.value.balanceSide)],
        ['사용여부', selected.value.isActive ? '사용' : '미사용'],
      ]
    : [],
)
const advanced = computed(() =>
  selected.value
    ? [
        ['영문명', selected.value.englishName || '미설정'],
        ['표준재무제표코드', selected.value.statementCode || '미설정'],
        ['세부속성', selected.value.attribute || '미설정'],
        ['관계계정', selected.value.relatedAccount || '미설정'],
        ['외화 처리 코드', selected.value.fxMethodCode ?? '미설정'],
        ['업무용승용차 관련', selected.value.businessCar ? '예' : '아니요'],
      ]
    : [],
)
</script>
<template>
  <section class="am-page">
    <div>
      <UiButton :disabled="loading" @click="reload(true)">기본 계정과목 불러오기</UiButton>
      <UiButton
        variant="primary"
        :disabled="loading || !s.loaded"
        @click="guard(() => editAccount())">
        + 계정과목 추가
      </UiButton>
      <UiButton :loading="loading" @click="reload()">새로고침</UiButton>
    </div>
    <div v-if="loadError" class="am-load-error" role="alert">
      {{ loadError }}
      <UiButton :disabled="loading" @click="reload()">다시 불러오기</UiButton>
    </div>
    <p v-if="loading" role="status" class="am-help">기본 계정과목을 불러오는 중입니다.</p>
    <fieldset class="am-content" :disabled="loading" :aria-busy="loading">
      <nav class="am-tabs" aria-label="관리 화면">
        <button
          :class="{ active: s.section === 'accounts' }"
          :aria-pressed="s.section === 'accounts'"
          @click="
            guard(() => {
              s.section = 'accounts'
            })
          ">
          계정과목 관리
          <span>{{ s.accounts.length }}</span>
        </button>
        <button
          :class="{ active: s.section === 'summaries' }"
          :aria-pressed="s.section === 'summaries'"
          @click="
            guard(() => {
              s.section = 'summaries'
            })
          ">
          적요 전체관리
          <span>{{ s.summaries.length }}</span>
        </button>
      </nav>
      <div v-if="s.section === 'accounts'" class="am-workspace has-detail">
        <AccountCategoryTree
          :accounts="s.accounts"
          :category="s.category"
          :subcategory="s.subcategory"
          @select="
            (category, subcategory) => {
              s.category = category
              s.subcategory = subcategory
            }
          " />
        <section class="am-list" aria-label="계정과목 목록">
          <div class="am-toolbar">
            <UiInput
              v-model="s.query"
              aria-label="계정코드 또는 계정과목명 검색"
              placeholder="계정코드 또는 계정과목명 검색" />
            <UiSelect
              v-model="s.active"
              aria-label="계정과목 사용여부"
              :options="[
                { value: '', label: '사용여부 전체' },
                { value: 'true', label: '사용' },
                { value: 'false', label: '미사용' },
              ]" />
          </div>
          <div class="am-list-meta">
            <span>
              {{ s.subcategory || s.category || '전체 계정과목' }} ·
              <strong>{{ rows.length }}</strong>
              개
              <span v-if="s.checked.length">/ {{ s.checked.length }}개 선택</span>
            </span>
            <UiButton size="small" :aria-pressed="s.compact" @click="s.compact = !s.compact">
              {{ s.compact ? '압축' : '기본' }} 밀도
            </UiButton>
          </div>
          <AccountTable
            :rows="rows"
            :selected-id="s.selectedId"
            :checked="s.checked"
            :compact="s.compact"
            :sort="s.sort"
            :descending="s.descending"
            @select="select"
            @check="s.checked = $event"
            @sort="sort" />
          <div class="am-list-meta">
            행을 선택하면 계정과목 정보와 연결적요를 확인할 수 있습니다.
          </div>
        </section>
        <aside class="am-detail" aria-label="계정과목 상세">
          <template v-if="selected">
            <header class="am-detail-header">
              <div>
                <span class="am-code">{{ selected.code }}</span>
                <h2>{{ selected.name }}</h2>
                <span class="am-status" :class="{ inactive: !selected.isActive }">
                  {{ selected.isActive ? '사용' : '미사용' }}
                </span>
              </div>
              <div class="am-actions">
                <UiButton
                  size="small"
                  @click="
                    guard(() => {
                      editAccount(selected)
                      s.detailTab = '기본정보'
                    })
                  ">
                  편집
                </UiButton>
                <UiButton
                  size="small"
                  variant="ghost"
                  aria-label="상세 패널 닫기"
                  @click="
                    guard(() => {
                      s.selectedId = null
                    })
                  ">
                  ✕
                </UiButton>
              </div>
            </header>
            <div class="am-detail-body">
              <form v-if="s.accountDraft && !s.addingAccount" @submit.prevent="saveAccount">
                <AccountFields v-model="s.accountDraft" :accounts="s.accounts" />
                <p v-if="error" class="am-error" role="alert">{{ error }}</p>
                <div class="am-actions">
                  <UiButton variant="primary" type="submit">저장</UiButton>
                  <UiButton @click="guard(() => {})">취소</UiButton>
                </div>
              </form>
              <template v-else>
                <h3>기본정보</h3>
                <dl class="am-info">
                  <div v-for="[label, value] in basic" :key="label">
                    <dt>{{ label }}</dt>
                    <dd>{{ value }}</dd>
                  </div>
                </dl>
                <h3>확장정보</h3>
                <p class="am-help">
                  기본 계정과목의 확장정보입니다. 미설정 값은 그대로 표시하며 외화 처리 코드는
                  원문으로 표시합니다.
                </p>
                <dl class="am-info">
                  <div v-for="[label, value] in advanced" :key="label">
                    <dt>{{ label }}</dt>
                    <dd>{{ value }}</dd>
                  </div>
                </dl>
                <div class="am-list-meta">
                  <strong>연결된 적요 {{ linked.length }}개</strong>
                  <UiButton size="small" :disabled="!s.accounts.length" @click="openSummary()">
                    + 적요 추가
                  </UiButton>
                </div>
                <section v-for="side in sides" :key="side" class="am-summary-group">
                  <h3>
                    {{ sideLabel(side) }} 적요
                    <span>{{ linked.filter((row) => row.side === side).length }}</span>
                  </h3>
                  <article
                    v-for="row in linked.filter((row) => row.side === side)"
                    :key="row.id"
                    class="am-summary-item">
                    <div>
                      <small class="am-code">
                        {{ row.code }} · {{ row.isFixed ? '고정' : '일반' }} ·
                        {{ row.isActive ? '사용' : '미사용' }}
                      </small>
                      <p>{{ row.name }}</p>
                    </div>
                    <div class="am-actions">
                      <UiButton
                        size="small"
                        variant="ghost"
                        :aria-label="row.name + ' 수정'"
                        @click="openSummary(row)">
                        수정
                      </UiButton>
                      <UiButton
                        size="small"
                        variant="ghost"
                        :aria-label="row.name + ' 삭제'"
                        @click="remove(row)">
                        삭제
                      </UiButton>
                    </div>
                  </article>
                  <p v-if="!linked.some((row) => row.side === side)" class="am-help">
                    연결된 적요가 없습니다.
                  </p>
                </section>
              </template>
            </div>
          </template>
          <div v-else class="am-detail-placeholder">
            <h2>계정과목 상세</h2>
            <p>계정과목을 선택하면 기본정보, 확장정보와 연결적요가 여기에 표시됩니다.</p>
          </div>
        </aside>
      </div>
      <section v-else class="am-summary-page">
        <p class="am-list-meta">
          {{ s.summaryClientName ? s.summaryClientName + ' · 실제 적요' : '적요 조회' }} ·
          차변/대변은 매핑 미확정이며 거래요소 코드를 원문으로 표시합니다.
        </p>
        <p v-if="s.summaryLoadError" class="am-load-error" role="alert">
          {{ s.summaryLoadError }}
          <UiButton @click="reload()">다시 불러오기</UiButton>
        </p>
        <div class="am-toolbar">
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
            :options="[
              { value: '', label: '차변/대변 전체' },
              { value: 'DEBIT', label: '차변' },
              { value: 'CREDIT', label: '대변' },
              { value: 'UNKNOWN', label: '미확정' },
            ]" />
          <UiSelect
            v-model="s.summaryFixed"
            aria-label="고정적요 필터"
            :options="[
              { value: '', label: '고정/일반 전체' },
              { value: 'true', label: '고정' },
              { value: 'false', label: '일반' },
            ]" />
          <UiButton variant="primary" :disabled="!s.accounts.length" @click="openSummary()">
            + 적요 추가
          </UiButton>
        </div>
        <div class="am-list-meta">전체 적요 · {{ summaries.length }}개</div>
        <SummaryTable
          :rows="summaries"
          :accounts="summaryAccounts"
          @edit="openSummary"
          @delete="remove" />
      </section>
    </fieldset>
    <UiModal
      :open="Boolean(s.accountDraft && s.addingAccount)"
      title="계정과목 추가"
      @close="guard(() => {})">
      <form v-if="s.accountDraft && s.addingAccount" class="am-page" @submit.prevent="saveAccount">
        <AccountFields v-model="s.accountDraft" :accounts="s.accounts" />
        <p v-if="error" role="alert" class="am-error">{{ error }}</p>
        <div class="am-form-footer">
          <UiButton @click="guard(() => {})">취소</UiButton>
          <UiButton variant="primary" type="submit">화면에 추가</UiButton>
        </div>
      </form>
    </UiModal>
    <UiModal
      :open="Boolean(s.summaryDraft)"
      :title="s.summaries.some((row) => row.id === s.summaryDraft?.id) ? '적요 수정' : '적요 추가'"
      @close="guard(() => {})">
      <form v-if="s.summaryDraft" class="am-page" @submit.prevent="saveSummary">
        <SummaryFields v-model="s.summaryDraft" :accounts="summaryAccounts" />
        <p v-if="error" role="alert" class="am-error">{{ error }}</p>
        <div class="am-form-footer">
          <UiButton @click="guard(() => {})">취소</UiButton>
          <UiButton variant="primary" type="submit">저장</UiButton>
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

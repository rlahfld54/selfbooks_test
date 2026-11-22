<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AccountFields from './AccountFields.vue'
import { sideLabel, summaryKind } from '../types'
import type { MockAccount, MockSummary, Side } from '../types'

const props = defineProps<{
  summary?: MockSummary
  account?: MockAccount | null
  accounts: MockAccount[]
  linked: MockSummary[]
  addingAccount: boolean
  error: string
}>()

const draft = defineModel<MockAccount | null>('draft', { required: true })
const emit = defineEmits<{
  'edit-account': []
  'save-account': []
  'cancel-edit': []
  'add-summary': []
  'edit-summary': [summary: MockSummary]
  'delete-summary': [summary: MockSummary]
}>()

type InfoRow = { label: string; value: string | number }
const matrix = defineModel<boolean>('matrix', { default: false })
const panel = ref<HTMLElement | null>(null)
watch(
  () => props.summary?.id,
  () => {
    panel.value?.scrollTo({ top: 0 })
  },
  { flush: 'post' },
)
const basicInfo = computed<InfoRow[]>(() => {
  const a = props.account
  return a
    ? [
        { label: '중분류', value: a.subcategory || '—' },
        { label: '세부속성', value: a.attribute || '미설정' },
        { label: Number(a.code) < 1000 ? '성격(자동판단)' : '성격(직접설정)', value: a.category },
        { label: '관계계정', value: a.relatedAccount || '없음' },
        { label: '정상잔액', value: sideLabel(a.balanceSide) },
      ]
    : []
})
const advancedInfo = computed<InfoRow[]>(() => {
  const a = props.account
  return a
    ? [
        { label: '표준재무제표코드', value: a.statementCode || '미설정' },
        { label: '출력용명칭', value: a.displayName || '—' },
        { label: '영문명', value: a.englishName || '미설정' },
        { label: '과목코드', value: a.code },
        { label: '사용여부', value: a.isActive ? '사용' : '미사용' },
        {
          label: '외화여부',
          value:
            a.foreignCurrency === undefined ? '정보 미제공' : a.foreignCurrency ? '예' : '아니요',
        },
        { label: '외화 처리 코드', value: a.fxMethodCode ?? '미설정' },
        {
          label: '업무용승용차여부',
          value: a.businessCar === undefined ? '정보 미제공' : a.businessCar ? '예' : '아니요',
        },
      ]
    : []
})
const summaryGroups = computed(() =>
  (['DEBIT', 'CREDIT', 'UNKNOWN'] as const satisfies readonly (Side | 'UNKNOWN')[]).map((side) => ({
    side,
    label: side === 'UNKNOWN' ? '기타 (미확정)' : sideLabel(side),
    rows: props.linked.filter((row) => row.side === side),
  })),
)
</script>

<template>
  <aside
    ref="panel"
    id="account-detail"
    class="am-detail am-refined-detail"
    aria-label="계정과목 상세">
    <template v-if="account">
      <header class="am-detail-header">
        <div>
          <p v-if="summary" class="am-selected-summary">
            선택 거래적요
            <br />
            <strong>{{ summary.code }} · {{ summary.name }}</strong>
          </p>
          <small>연결 계정과목</small>
          <br />
          <span class="am-code">
            {{ account.code }} · {{ account.isLocked ? '표준계정 · 잠금' : '사용자 설정' }}
          </span>
          <h2>{{ account.name }}</h2>
          <span class="am-status" :class="{ inactive: !account.isActive }">
            {{ account.isActive ? '사용' : '미사용' }}
          </span>
        </div>
        <div class="am-actions">
          <UiButton type="button" size="small" @click="emit('edit-account')">편집</UiButton>
        </div>
      </header>

      <div class="am-detail-body" aria-label="상세정보">
        <form v-if="draft && !addingAccount" novalidate @submit.prevent="emit('save-account')">
          <AccountFields v-model="draft" :accounts="accounts" />
          <p v-if="error" class="am-error" role="alert">{{ error }}</p>
          <div class="am-actions am-refined-detail-actions">
            <UiButton type="button" @click="emit('cancel-edit')">취소</UiButton>
            <UiButton type="submit" variant="primary">저장</UiButton>
          </div>
        </form>
        <template v-else>
          <section class="am-refined-info-section">
            <h3>기본정보</h3>
            <dl class="am-info">
              <div v-for="item in basicInfo" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </section>
          <section class="am-refined-info-section">
            <h3>확장정보</h3>
            <dl class="am-info">
              <div v-for="item in advancedInfo" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </section>
          <section class="am-refined-info-section">
            <div class="am-refined-linked-heading">
              <h3>
                연결된 적요
                <span>{{ linked.length }}</span>
              </h3>

              <UiButton
                type="button"
                size="small"
                :disabled="!accounts.length"
                @click="emit('add-summary')">
                + 적요 추가
              </UiButton>
            </div>
            <div class="am-view-switch" role="group" aria-label="연결적요 배치">
              <button type="button" :aria-pressed="!matrix" @click="matrix = false">세로형</button>
              <button type="button" :aria-pressed="matrix" @click="matrix = true">좌우형</button>
            </div>
            <div :class="{ 'am-summary-matrix': matrix }">
              <section v-for="group in summaryGroups" :key="group.side" class="am-summary-group">
                <h3>
                  {{ group.label }} 적요
                  <span>{{ group.rows.length }}</span>
                </h3>
                <article
                  v-for="row in group.rows"
                  :key="row.id"
                  class="am-summary-item"
                  :class="{ selected: summary?.id === row.id }">
                  <div :title="row.note">
                    <small class="am-code">
                      {{ row.code }} · {{ summaryKind(row) }} ·
                      {{ row.isActive ? '사용' : '미사용' }}
                    </small>
                    <p>{{ row.name }}</p>
                    <small>
                      {{
                        row.canExclude === undefined
                          ? '조회제외 권한 미제공'
                          : row.excluded
                            ? '조회제외'
                            : row.canExclude
                              ? '노출'
                              : '필수 노출'
                      }}
                    </small>
                  </div>
                  <div class="am-actions">
                    <UiButton
                      type="button"
                      size="small"
                      variant="ghost"
                      :aria-label="`${row.name} 수정`"
                      @click="emit('edit-summary', row)">
                      수정
                    </UiButton>
                    <UiButton
                      type="button"
                      size="small"
                      variant="ghost"
                      :aria-label="`${row.name} 삭제`"
                      @click="emit('delete-summary', row)">
                      삭제
                    </UiButton>
                  </div>
                </article>
                <p v-if="group.rows.length === 0" class="am-help">연결된 적요가 없습니다.</p>
              </section>
            </div>
          </section>
        </template>
      </div>
    </template>
    <div v-else class="am-detail-placeholder">
      <h2>계정과목 상세</h2>
      <p>거래적요를 선택하면 기본정보, 확장정보와 연결 적요가 표시됩니다.</p>
    </div>
  </aside>
</template>

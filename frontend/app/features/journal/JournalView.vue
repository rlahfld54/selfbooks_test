<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { companyPartners, type DemoRow } from '~/features/demo-partners/services/mockPartners'
import { demoPartnerDetailSession } from '~/features/demo-partners/composables/useDemoPartnerDetail'
import { journalSession } from './composables/useJournalSession'
import { voucherColumns, voucherRows } from './services/mockJournal'

const { activeTab, company, density, setDirty } = useWorkspaceContext()
const tab = activeTab.value
const session = journalSession(tab)
const detail = demoPartnerDetailSession(tab)
const searchOpen = ref(false)
const partners = computed(() => companyPartners(company.value))

function selectPartner(row: DemoRow) {
  session.draft.partner = row.name
  detail.selected = row.id
  edit()
  searchOpen.value = false
}
function selectRow(row: Record<string, unknown>) {
  detail.selected = String(row.id)
  tab.panel = true
}
function edit() { setDirty(tab) }
</script>

<template>
  <div>
    <PageToolbar title="일반전표입력" description="전표 입력 화면의 구조와 공통 UI를 확인하세요.">
      <template #eyebrow>ACCOUNTING</template>
      <UiBadge tone="neutral">UI 샘플</UiBadge>
      <UiButton @click="tab.panel = !tab.panel"><UiIcon name="document" :size="16" />상세 패널</UiButton>
      <UiButton variant="primary" disabled title="현재 버전은 UI 데모로 저장 기능이 없습니다.">저장 (연동 예정)</UiButton>
    </PageToolbar>
    <div class="info-banner">
        <UiIcon name="document" :size="18" /><span
          >입력 내용은 이 탭을 사용하는 동안만 유지됩니다. 실제 전표 저장이나 회계 검증은 수행하지
          않습니다.</span
        >
      </div>
      <UiCard title="기본 정보"
        ><template #actions
          ><UiBadge v-if="tab.dirty" tone="warning">미저장 변경</UiBadge
          ><UiBadge v-else tone="neutral">입력 대기</UiBadge></template
        >
        <div class="form-grid voucher-form">
          <FormField id="voucher-date" label="전표일자"
            ><DatePicker
              id="voucher-date"
              v-model="session.draft.date"
              @update:model-value="edit" /></FormField
          ><FormField id="voucher-partner" label="거래처"
            ><div class="input-action">
              <UiInput
                id="voucher-partner"
                v-model="session.draft.partner"
                placeholder="거래처 선택 또는 입력"
                @update:model-value="edit"
                @keydown.f2.prevent="searchOpen = true"
              /><UiButton aria-label="거래처 검색" @click="searchOpen = true"
                ><UiIcon name="search" :size="18"
              /></UiButton></div></FormField
          ><FormField
            id="voucher-memo"
            label="적요"
            class="span-two"
            hint="샘플 입력 · 탭 전환 시 유지됩니다."
            v-slot="field"
            ><UiInput
              :id="field.id"
              v-model="session.draft.memo"
              placeholder="거래 내용을 입력하세요"
              :aria-describedby="field.describedby"
              @update:model-value="edit"
          /></FormField></div></UiCard
      ><UiCard title="분개 내역 예시" class="section-gap"
        ><template #actions><span class="muted">편집 그리드는 후속 구현 예정</span></template
        ><DataTable
          :columns="voucherColumns"
          :rows="voucherRows" :view-state="session.table"
          :selected="detail.selected"
          :density="density"
          caption="읽기 전용 분개 예시"
          @select="selectRow"
          @update:density="density = $event"
        />
        <div class="voucher-totals">
          <span>예시 차변 합계 <strong>1,500,000 원</strong></span
          ><span>예시 대변 합계 <strong>1,500,000 원</strong></span
          ><UiBadge tone="neutral">고정 예시</UiBadge>
        </div></UiCard>
    <SearchDialog :open="searchOpen" :items="partners" @close="searchOpen = false" @select="selectPartner" />
  </div>
</template>

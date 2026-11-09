<script setup lang="ts">
import { companyPartners, type DemoRow } from '~/data/demo'
import { menu, type WorkTab } from '~/utils/workspace'
const props = defineProps<{ tab: WorkTab; company: string; density: 'normal' | 'compact' }>()
const emit = defineEmits<{
  'update:density': [value: 'normal' | 'compact']
  notify: [message: string]
}>()
const searchOpen = ref(false)
const title = computed(() => menu.find((item) => item.id === props.tab.id)?.title || '')
const partners = computed(() => companyPartners(props.company))
const filtered = computed(() =>
  partners.value.filter((row) => (row.name + row.code).includes(props.tab.query.trim())),
)
const columns = [
  { key: 'code', label: '코드', width: '90px' },
  { key: 'name', label: '거래처명', width: '210px' },
  { key: 'contact', label: '연락처', width: '160px' },
  { key: 'date', label: '최근 거래일', width: '140px' },
  { key: 'status', label: '상태', width: '120px' },
  { key: 'amount', label: '거래금액 (원)', width: '160px', amount: true },
]
const voucherColumns = [
  { key: 'side', label: '구분', width: '80px' },
  { key: 'account', label: '계정과목', width: '180px' },
  { key: 'memo', label: '적요', width: '220px' },
  { key: 'debit', label: '차변 (원)', width: '160px', amount: true },
  { key: 'credit', label: '대변 (원)', width: '160px', amount: true },
]
const voucherRows = [
  {
    id: '1',
    side: '차변',
    account: '매출채권',
    memo: '상품 매출 예시',
    debit: '1500000',
    credit: '0',
  },
  { id: '2', side: '대변', account: '매출', memo: '상품 매출 예시', debit: '0', credit: '1500000' },
]
function selectPartner(row: DemoRow) {
  props.tab.draft.partner = row.name
  props.tab.selected = row.id
  props.tab.dirty = true
  searchOpen.value = false
}
function selectRow(row: Record<string, unknown>) {
  props.tab.selected = String(row.id)
  props.tab.panel = true
}
function edit() {
  props.tab.dirty = true
}
</script>
<template>
  <ClientDirectory
    v-if="tab.id === 'clients'"
    :tab="tab"
    :density="density"
    @update:density="emit('update:density', $event)"
  />
  <div v-else>
    <PageToolbar
      :title="title"
      :description="
        tab.id === 'voucher'
          ? '전표 입력 화면의 구조와 공통 UI를 확인하세요.'
          : '거래처 정보를 검색하고 상세 내용을 확인하세요.'
      "
      ><template #eyebrow>{{ tab.id === 'voucher' ? 'ACCOUNTING' : 'WORKSPACE' }}</template
      ><UiBadge tone="neutral">UI 샘플</UiBadge
      ><UiButton @click="tab.panel = !tab.panel"
        ><UiIcon name="document" :size="16" />상세 패널</UiButton
      ><UiButton
        v-if="tab.id === 'voucher'"
        variant="primary"
        disabled
        title="현재 버전은 UI 데모로 저장 기능이 없습니다."
        >저장 (연동 예정)</UiButton
      ></PageToolbar
    >
    <template v-if="tab.id === 'voucher'"
      ><div class="info-banner">
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
              v-model="tab.draft.date"
              @update:model-value="edit" /></FormField
          ><FormField id="voucher-partner" label="거래처"
            ><div class="input-action">
              <UiInput
                id="voucher-partner"
                v-model="tab.draft.partner"
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
              v-model="tab.draft.memo"
              placeholder="거래 내용을 입력하세요"
              :aria-describedby="field.describedby"
              @update:model-value="edit"
          /></FormField></div></UiCard
      ><UiCard title="분개 내역 예시" class="section-gap"
        ><template #actions><span class="muted">편집 그리드는 후속 구현 예정</span></template
        ><DataTable
          :columns="voucherColumns"
          :rows="voucherRows"
          :selected="tab.selected"
          :density="density"
          caption="읽기 전용 분개 예시"
          @select="selectRow"
          @update:density="emit('update:density', $event)"
        />
        <div class="voucher-totals">
          <span>예시 차변 합계 <strong>1,500,000 원</strong></span
          ><span>예시 대변 합계 <strong>1,500,000 원</strong></span
          ><UiBadge tone="neutral">고정 예시</UiBadge>
        </div></UiCard
      ></template
    >
    <template v-else-if="tab.id === 'partners' || tab.id === 'ledger'"
      ><UiCard :title="tab.id === 'partners' ? '거래처 목록' : '전표 조회 레이아웃 샘플'"
        ><div class="search-toolbar">
          <div class="search-input">
            <UiIcon name="search" :size="18" /><UiInput
              v-model="tab.query"
              aria-label="거래처 검색"
              placeholder="거래처명 또는 코드를 검색하세요"
            />
          </div>
          <span class="muted">행을 선택하면 상세 정보가 열립니다.</span>
        </div>
        <DataTable
          :columns="columns"
          :rows="filtered"
          :selected="tab.selected"
          :density="density"
          @select="selectRow"
          @update:density="emit('update:density', $event)"
          ><template #cell-status="{ value }"
            ><UiBadge :tone="value === '확인요망' ? 'warning' : 'success'">{{
              value
            }}</UiBadge></template
          ></DataTable
        ></UiCard
      ></template
    >
    <template v-else
      ><UiCard
        ><EmptyState
          :title="title + ' 업무 화면 준비 중'"
          description="공통 레이아웃과 탭 상태를 확인할 수 있습니다. 실제 업무 기능은 이번 버전에 포함되지 않습니다."
          ><FormField :id="tab.id + '-query'" label="탭별 조회 조건 샘플"
            ><UiInput
              :id="tab.id + '-query'"
              v-model="tab.query"
              placeholder="탭을 바꾸어도 유지됩니다" /></FormField></EmptyState></UiCard
    ></template>
    <SearchDialog
      :open="searchOpen"
      :items="partners"
      @close="searchOpen = false"
      @select="selectPartner"
    />
  </div>
</template>

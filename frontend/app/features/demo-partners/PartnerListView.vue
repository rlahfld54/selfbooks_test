<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { tabInfo } from '~/utils/workspace-routes'
import { companyPartners } from './services/mockPartners'
import { demoPartnerDetailSession } from './composables/useDemoPartnerDetail'
import { partnerListSession } from './composables/usePartnerListSession'

const props = defineProps<{ mode: 'partners' | 'ledger' }>()
const { company, activeTab, density } = useWorkspaceContext()
const tab = activeTab.value
const session = partnerListSession(tab)
const detail = demoPartnerDetailSession(tab)
const title = computed(() => tabInfo(props.mode).title)
const rows = computed(() => companyPartners(company.value)
  .filter(row => (row.name + row.code).includes(session.query.trim())))
const columns = [
  { key: 'code', label: '코드', width: '90px' },
  { key: 'name', label: '거래처명', width: '210px' },
  { key: 'contact', label: '연락처', width: '160px' },
  { key: 'date', label: '최근 거래일', width: '140px' },
  { key: 'status', label: '상태', width: '120px' },
  { key: 'amount', label: '거래금액 (원)', width: '160px', amount: true },
]
function selectRow(row: Record<string, unknown>) {
  detail.selected = String(row.id)
  tab.panel = true
}
</script>

<template>
  <div>
    <PageToolbar :title="title" description="거래처 정보를 검색하고 상세 내용을 확인하세요.">
      <template #eyebrow>WORKSPACE</template>
      <UiBadge tone="neutral">UI 샘플</UiBadge>
      <UiButton @click="tab.panel = !tab.panel"><UiIcon name="document" :size="16" />상세 패널</UiButton>
    </PageToolbar>
    <UiCard :title="mode === 'partners' ? '거래처 목록' : '전표 조회 레이아웃 샘플'">
      <div class="search-toolbar">
        <div class="search-input">
          <UiIcon name="search" :size="18" />
          <UiInput v-model="session.query" aria-label="거래처 검색" placeholder="거래처명 또는 코드를 검색하세요" />
        </div>
        <span class="muted">행을 선택하면 상세 정보가 열립니다.</span>
      </div>
      <DataTable
        :columns="columns" :rows="rows" :selected="detail.selected" :density="density"
        :view-state="session.table" @select="selectRow" @update:density="density = $event"
      >
        <template #cell-status="{ value }">
          <UiBadge :tone="value === '확인요망' ? 'warning' : 'success'">{{ value }}</UiBadge>
        </template>
      </DataTable>
    </UiCard>
  </div>
</template>

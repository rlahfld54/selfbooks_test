<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { tabInfo } from '~/utils/workspace-routes'
import { companyPartners } from './services/mockPartners'
import { demoPartnerDetailSession } from './composables/useDemoPartnerDetail'
import { partnerListSession } from './composables/usePartnerListSession'
import PartnerImportDialog from './components/PartnerImportDialog.vue'
import type { ImportedPartner } from './services/partnerImport'
import {
  createPartnersService,
  partnerColumns,
  partnerTableRow,
  partnerCellIssue,
} from './services/partnersApi'
import { useBackendApi } from '~/composables/useBackendApi'
import { ApiRequestError } from '~/services/api-client'
import {
  formatBusinessNumber,
  formatCorporationNumber,
  formatPhoneNumber,
  formatMobileNumber,
} from '~/utils/number-validation'
import { formatEmail } from '~/utils/email-validation'

const cellFormatters = {
  registration: formatBusinessNumber,
  corporationNumber: formatCorporationNumber,
  phone: formatPhoneNumber,
  mobile: formatMobileNumber,
  email: formatEmail,
}

const props = defineProps<{ mode: 'partners' | 'ledger' }>()
const { company, activeTab, density, setDirty } = useWorkspaceContext()
const tab = activeTab.value
const session = partnerListSession(tab)
const detail = demoPartnerDetailSession(tab)
const title = computed(() => tabInfo(props.mode).title)
const importing = ref(false)
const notice = ref('')
const loading = ref(false),
  saving = ref(false),
  error = ref(''),
  saveError = ref('')
const { pagesPreview } = useRuntimeConfig().public
const service = createPartnersService(useBackendApi(30000))
const allRows = computed(() =>
  props.mode === 'partners' ? session.imported : companyPartners(company.value),
)
function message(failure: unknown) {
  return failure instanceof ApiRequestError
    ? failure.message
    : '서버에 연결하지 못했습니다. 다시 시도해 주세요.'
}
async function load() {
  if (props.mode !== 'partners' || pagesPreview || saving.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    session.imported = (await service.list()).data
    console.log('데이터 = ', session.imported)
    session.loaded = true
  } catch (failure) {
    error.value = message(failure)
  } finally {
    loading.value = false
  }
}
function closeImport() {
  if (saving.value) return
  importing.value = false
  saveError.value = ''
  setDirty(tab, false)
}
async function register(rows: ImportedPartner[], batchId: string) {
  if (saving.value || pagesPreview) return
  saving.value = true
  saveError.value = ''
  notice.value = ''
  try {
    const saved = (await service.insert(rows, batchId)).data
    const ids = new Set(saved.map((row) => row.id))
    session.imported = [...session.imported.filter((row) => !ids.has(row.id)), ...saved]
    session.query = ''
    setDirty(tab, false)
    importing.value = false
    notice.value = `${saved.length}건을 DB에 저장했습니다.`
  } catch (failure) {
    saveError.value = message(failure)
  } finally {
    saving.value = false
  }
}
onMounted(load)
const rows = computed(() =>
  allRows.value
    .filter((row) =>
      (row.name + row.code + ('registration' in row ? row.registration : '')).includes(
        session.query.trim(),
      ),
    )
    .map((row) => (props.mode === 'partners' ? partnerTableRow(row as ImportedPartner) : row)),
)
const columns = computed(() =>
  props.mode === 'partners'
    ? partnerColumns
    : [
        { key: 'code', label: '코드', width: '90px' },
        { key: 'name', label: '거래처명', width: '210px' },
        { key: 'contact', label: '연락처', width: '160px' },
        { key: 'date', label: '최근 거래일', width: '140px' },
        { key: 'status', label: '상태', width: '120px' },
        { key: 'amount', label: '거래금액 (원)', width: '160px', amount: true },
      ],
)
function selectRow(row: Record<string, unknown>) {
  detail.selected = String(row.id)
  tab.panel = true
}
</script>

<template>
  <div data-ui-partner-list-view>
    <PageToolbar data-ui-partner-list-view>
      <UiBadge data-ui-partner-list-view tone="neutral">{{ mode === 'partners' ? 'DB 거래처' : 'UI 샘플' }}</UiBadge>
      <UiButton data-ui-partner-list-view
        v-if="mode === 'partners'"
        :disabled="loading || saving || pagesPreview"
        @click="load">
        새로고침
      </UiButton>
      <UiButton data-ui-partner-list-view
        v-if="mode === 'partners'"
        variant="primary"
        :disabled="loading || saving || !session.loaded || pagesPreview"
        @click="importing = true">
        엑셀 등록
      </UiButton>
      <UiButton data-ui-partner-list-view @click="tab.panel = !tab.panel">
        <UiIcon data-ui-partner-list-view name="document" :size="16" />
        상세 패널
      </UiButton>
    </PageToolbar>
    <p data-ui-partner-list-view v-if="notice" role="status" class="info-banner">{{ notice }}</p>
    <UiCard data-ui-partner-list-view :title="mode === 'partners' ? '거래처 목록' : '전표 조회 레이아웃 샘플'">
      <div data-ui-partner-list-view class="search-toolbar">
        <div data-ui-partner-list-view class="search-input">
          <UiIcon data-ui-partner-list-view name="search" :size="18" />
          <UiInput data-ui-partner-list-view
            v-model="session.query"
            aria-label="거래처 검색"
            placeholder="업체명, 사업자등록번호 또는 코드를 검색하세요" />
        </div>
        <UiButton :disabled="!session.query" @click="session.query = ''">초기화</UiButton>
        <span data-ui-partner-list-view class="muted">행을 선택하면 상세 정보가 열립니다.</span>
      </div>
      <DataTable data-ui-partner-list-view
        :columns="columns"
        :loading="loading"
        :error="error"
        configurable-columns
        :empty-title="allRows.length ? '검색 조건에 맞는 거래처가 없습니다.' : '등록된 거래처가 없습니다.'"
        :empty-description="allRows.length ? '검색어를 초기화해보세요.' : ''"
        @retry="load"
        :sample="mode !== 'partners'"
        :page-size="mode === 'partners' ? 20 : 5"
        :rows="rows"
        :selected="detail.selected"
        :density="density"
        :view-state="session.table"
        @select="selectRow"
        @update:density="density = $event">
        <template
          v-for="key in ['registration', 'corporationNumber', 'phone', 'mobile', 'email']"
          :key="key"
          #[`cell-${key}`]="{ row, value }">
          <span data-ui-partner-list-view>{{ cellFormatters[key](String(value ?? '')) }}</span>
          <span data-ui-partner-list-view
            v-if="partnerCellIssue(row, key)"
            class="number-issue"
            :title="partnerCellIssue(row, key)">
            {{ partnerCellIssue(row, key) }}
          </span>
        </template>
        <template #cell-status="{ value }">
          <UiBadge data-ui-partner-list-view :tone="value === '확인요망' ? 'warning' : 'success'">{{ value }}</UiBadge>
        </template>
      </DataTable>
    </UiCard>
    <PartnerImportDialog data-ui-partner-list-view
      v-if="importing"
      :existing="allRows"
      :saving="saving"
      :save-error="saveError"
      @dirty="setDirty(tab)"
      @close="closeImport"
      @register="register" />
  </div>
</template>

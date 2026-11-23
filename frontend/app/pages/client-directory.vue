<script setup lang="ts">
import { useClientStore } from '~/stores/clientStore'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { managementSession } from '~/features/management/session'
import { filterClients, createManagementFilters, resetManagementFilters } from '~/features/management/management'
import { clientWorkLinks } from '~/features/management/client-work'
import { assignById, assignmentRole, canOpenClient } from '~/features/management/assignments'
import { useClientAssignments } from '~/features/management/useClientAssignments'
import type { Client } from '~/features/management/data'
import ManagementClientList from '~/features/management/components/ManagementClientList.vue'
import ManagementClientDrawer from '~/features/management/components/ManagementClientDrawer.vue'
import ManagementActionDialog from '~/features/management/components/ManagementActionDialog.vue'
import type { ManagementFilters, ManagementDestination } from '~/features/management/view-types'

definePageMeta({ workspaceTab: 'clients' })
const clientStore = useClientStore()

const { state, density } = useWorkspaceContext()
const data = managementSession(state)
const route = useRoute()
const router = useRouter()
const modal = ref('')
const message = ref('')
const form = reactive<Record<string, string>>({})
const secondary = ref<string[]>([])
const staffQuery = ref('')
const activeStaff = computed(() => data.staff.filter((row) => row.status === '활성'))
const filteredActiveStaff = computed(() =>
  activeStaff.value.filter((row) => (row.name + row.team).includes(staffQuery.value.trim())),
)
let toastTimer: ReturnType<typeof setTimeout> | undefined
const filters = reactive<ManagementFilters>(createManagementFilters())
function setFilter(key: keyof ManagementFilters, value: string) {
  filters[key] = value
}
function resetFilters() { resetManagementFilters(filters) }
const selectedClientId = ref('')
const selectedClient = computed<Client | undefined>({
  get: () => clientStore.clients.find(row => row.id === selectedClientId.value && canOpenClient(row, directoryUser.value)),
  set: client => { selectedClientId.value = client?.id ?? '' },
})
const {
  user: directoryUser,
  admin,
  mine,
  summary,
  loading: directoryLoading,
  error: directoryError,
  reload: reloadDirectory,
} = useClientAssignments()
const directoryTab = computed(() => (admin.value && route.query.tab !== 'mine' ? 'all' : 'mine'))
function selectDirectoryTab(value: string) {
  resetFilters()
  selectedClient.value = undefined
  void router.replace({ path: route.path, query: { tab: value } })
}
function selectClient(client: Client) {
  if (canOpenClient(client, directoryUser.value)) selectedClient.value = client
}
async function openClientWork(client: Client, destination = '/client-work') {
  if (!canOpenClient(client, directoryUser.value)) return
  await router.push({ path: destination, query: { clientId: client.id } })
  selectedClient.value = undefined
}
async function clientDestination(destination: ManagementDestination) {
  if (!selectedClient.value) return
  const path =
    destination === 'client-work'
      ? '/client-work'
      : clientWorkLinks.find((link) => link.id === destination && link.enabled)?.path
  if (path) await openClientWork(selectedClient.value, path)
}

const clients = computed(() =>
  filterClients(
    directoryTab.value === 'mine'
      ? mine.value.filter(
          (row) =>
            !filters.role || assignmentRole(row, directoryUser.value?.id ?? '') === filters.role,
        )
      : clientStore.clients,
    filters.query,
    filters.biz,
    filters.kind,
    filters.status,
    filters.person,
    filters.review,
  ),
)
const staffOptions = computed(() => data.staff.map((row) => ({ id: row.id, name: row.name })))
const modalTitle = computed(() =>
  modal.value === '담당자 지정' && selectedClient.value
    ? `담당자 지정 · ${selectedClient.value.name}`
    : modal.value,
)
const rows = computed(() => ({
  filteredClients: clients.value,
  clientStats: {
    total: clientStore.clients.length,
    active: clientStore.clients.filter((row) => row.status === '수임 중').length,
    reviewPending: clientStore.clients.filter((row) => ['검토 전', '검토 중'].includes(row.company))
      .length,
    ended: clientStore.clients.filter((row) => row.status === '수임 종료').length,
  },
}))
watch(
  () => [route.query.client, data.directory.status] as const,
  ([id]) => {
    if (typeof id !== 'string') return
    selectedClient.value = clientStore.clients.find(
      (row) => row.id === id && canOpenClient(row, directoryUser.value),
    )
  },
  { immediate: true },
)

function showToast(text: string) {
  clearTimeout(toastTimer)
  message.value = text
  toastTimer = setTimeout(() => {
    message.value = ''
  }, 2700)
}
function setField(key: string, value: string) {
  form[key] = value
}
function closeModal() {
  modal.value = ''
  message.value = ''
  Object.keys(form).forEach((key) => delete form[key])
}
function closeClient() {
  selectedClient.value = undefined
  if (route.query.client)
    void router.replace({ path: route.path, query: { tab: directoryTab.value } })
}
function open(title: string) {
  if (title === '수임업체 등록') {
    showToast('업체 등록 저장 API 연결이 필요합니다. 조회된 업체만 표시합니다.')
    return
  }
  if (['수임업체 등록', '담당자 지정'].includes(title) && !admin.value) return
  clearTimeout(toastTimer)
  Object.keys(form).forEach((key) => delete form[key])
  const client = title === '담당자 지정' ? selectedClient.value : undefined
  Object.assign(form, {
    type: '개인',
    primary: client?.primaryId || activeStaff.value[0]?.id || '',
    team: '세무1팀',
    status: '활성',
    start: '2026-11-17',
  })
  secondary.value = [...(client?.secondaryIds || [])]
  staffQuery.value = ''
  message.value = ''
  modal.value = title
}
function save() {
  if (!admin.value || modal.value !== '담당자 지정' || !selectedClient.value) return
  try {
    Object.assign(selectedClient.value, assignById(data.staff, form.primary || '', secondary.value))
    closeModal()
    showToast('화면 데이터에 반영했습니다. 새로고침하면 초기화됩니다.')
  } catch (error) {
    message.value = error instanceof Error ? error.message : '입력값을 확인해 주세요.'
  }
}
onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <div class="page management">
    <header class="page-header">
      <div class="actions">
        <button
          class="btn"
          @click="
            showToast(
              '업체는 기존 API로 Supabase에서 조회합니다. 담당자 배정만 화면에서 임시 적용됩니다.',
            )
          ">
          ⓘ 화면 안내
        </button>
        <button class="btn" :disabled="directoryLoading" @click="reloadDirectory()">
          새로고침
        </button>
        <button v-if="admin" class="btn primary" disabled title="업체 등록 저장 API 연결 필요">
          + 수임업체 등록 · 준비 중
        </button>
      </div>
    </header>
    <nav class="tabs" aria-label="수임업체 조회 범위">
      <button
        :class="{ active: directoryTab === 'mine' }"
        :aria-pressed="directoryTab === 'mine'"
        @click="selectDirectoryTab('mine')">
        내 담당 업체
      </button>
      <button
        v-if="admin"
        :class="{ active: directoryTab === 'all' }"
        :aria-pressed="directoryTab === 'all'"
        @click="selectDirectoryTab('all')">
        전체 업체
      </button>
    </nav>
    <p class="sub">
      실제 수임업체 조회 · 제공되지 않는 상세정보와 검토 상태는 정보 없음으로 표시합니다. 담당자
      변경은 임시 적용입니다.
    </p>
    <ManagementClientList
      :rows="rows"
      :filters="filters"
      :density="density"
      :staff-options="staffOptions"
      :loading="directoryLoading"
      :error="directoryError"
      :review-known="clientStore.clients.some((row) => row.company || row.environment)"
      :mine="directoryTab === 'mine'"
      :summary="summary"
      :user-id="directoryUser?.id || ''"
      :admin="admin"
      :selected-id="selectedClient?.id"
      :total="directoryTab === 'mine' ? mine.length : clientStore.clients.length"
      @filter="setFilter"
      @reset="resetFilters"
      @retry="reloadDirectory()"
      @select="selectClient"
      @work="openClientWork($event)" />
    <ManagementClientDrawer
      v-if="selectedClient"
      :client="selectedClient"
      :admin="admin"
      @close="closeClient"
      @assign="open('담당자 지정')"
      @navigate="clientDestination" />
    <ManagementActionDialog
      v-if="modal"
      :modal="modal"
      :title="modalTitle"
      :form="form"
      :secondary="secondary"
      :staff-query="staffQuery"
      :active-staff="activeStaff"
      :filtered-active-staff="filteredActiveStaff"
      :message="message"
      @close="closeModal"
      @save="save"
      @field="setField"
      @update:secondary="secondary = $event"
      @update:staff-query="staffQuery = $event"
      @message="message = $event" />
    <p v-if="message && !modal" role="status" class="toast management-toast">
      {{ message }}
    </p>
  </div>
</template>

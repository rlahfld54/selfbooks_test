<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import ClientDirectory from '~/features/client-directory/ClientDirectory.vue'
import { managementSession } from './session'
import { filterClients } from './management'
import { roles } from './data'
import { clientWorkLinks } from './client-work'
import { assignById, assignmentRole, canOpenClient } from './assignments'
import { useClientAssignments } from './useClientAssignments'
import AssignedClientSummary from './components/AssignedClientSummary.vue'
import type { Client, Staff } from './data'
import ManagementBadge from './ManagementBadge.vue'
import { useBackendApi } from '~/composables/useBackendApi'
import { createProfileService } from './profile-service'
import { mapProfile } from './profile-mapping'
import { formatProfileField } from './profile-format'
import { formatAmount } from '~/utils/formatAmount'

import ManagementClientList from './components/ManagementClientList.vue'
import ManagementProfilePanel from './components/ManagementProfilePanel.vue'
import ManagementOrganizationForm from './components/ManagementOrganizationForm.vue'
import ManagementStaffList from './components/ManagementStaffList.vue'
import ManagementPermissions from './components/ManagementPermissions.vue'
import ManagementBranches from './components/ManagementBranches.vue'
import ManagementClientDrawer from './components/ManagementClientDrawer.vue'
import ManagementStaffDrawer from './components/ManagementStaffDrawer.vue'
import ManagementActionDialog from './components/ManagementActionDialog.vue'
import type { ManagementFilters, ManagementRows, ManagementDestination } from './view-types'

const props = defineProps<{ page: 'mypage' | 'organization' | 'clients' }>()
const { state, navigate, activeTab, setDirty, density } = useWorkspaceContext()
const route = useRoute()
const router = useRouter()
const data = managementSession(state)
const { user: directoryUser, admin, mine, summary, loading: directoryLoading } = useClientAssignments()
const directoryTab = computed(() => admin.value && route.query.tab !== 'mine' ? 'all' : 'mine')
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
  const path = destination === 'client-work' ? '/client-work' : clientWorkLinks.find(link => link.id === destination && link.enabled)?.path
  if (path) await openClientWork(selectedClient.value, path)
}
const tab = ref(props.page === 'mypage' ? 'info' : 'basic')
const live = computed(() => props.page === 'clients' && admin.value && route.query.source === 'live')
const filters = reactive<ManagementFilters>({
  query: '', biz: '', kind: '', status: '', person: '', review: '', team: '', role: '',
})
const selectedClient = ref<Client>()
const selectedStaff = ref<Staff>()
const modal = ref('')
const message = ref('')
const form = reactive<Record<string, string>>({})
const secondary = ref<string[]>([])
const staffQuery = ref('')
const branchId = ref('')
const editing = ref(false)
const { public: { pagesPreview } } = useRuntimeConfig()
const profileLive = computed(() => props.page === 'mypage' && !pagesPreview)
const profileService = createProfileService(useBackendApi())
const mappedProfile = ref(mapProfile())
const profileLoading = ref(false)
const profileError = ref('')
let profileController: AbortController | undefined
const rows = computed<ManagementRows>(() => ({
  ...data,
  filteredClients: clients.value,
  filteredStaff: staff.value,
  person: profileLive.value ? mappedProfile.value.person : data.staff[0]!,
  organization: profileLive.value ? mappedProfile.value.organization : data.organization,
  clientStats: {
    total: data.clients.length,
    active: data.clients.filter((row) => row.status === '수임 중').length,
    reviewPending: data.clients.filter((row) => row.company !== '검토 완료').length,
    ended: data.clients.filter((row) => row.status === '수임 종료').length,
  },
}))
async function loadProfile() {
  profileController?.abort()
  const current = new AbortController()
  profileController = current
  profileLoading.value = true
  profileError.value = ''
  try {
    const result = await profileService.load(current.signal)
    if (!current.signal.aborted) mappedProfile.value = mapProfile(result)
  } catch (error) {
    if (!current.signal.aborted) profileError.value = error instanceof Error ? error.message : '내 정보를 불러오지 못했습니다.'
  } finally {
    if (profileController === current) profileLoading.value = false
  }
}
onMounted(() => { if (profileLive.value) void loadProfile() })
onBeforeUnmount(() => profileController?.abort())
const currentTab = activeTab.value
const titles = { mypage: '마이페이지', organization: '조직 설정', clients: '수임업체 관리' }
const pageCopy = {
  mypage: ['MY ACCOUNT', '내 계정 정보와 소속 조직, 보안 설정을 관리합니다.'],
  organization: ['ORGANIZATION', '회계법인 정보, 구성원, 역할 및 사무소를 관리합니다.'],
  clients: [
    'CLIENT MANAGEMENT',
    '수임업체를 조회하고 담당 업체의 업무를 관리합니다.',
  ],
}
const editableProfile = ['name', 'email', 'phone']
const organizationName = computed(() => rows.value.organization['회계법인명/사무소명'] || '—')
const clients = computed(() =>
  filterClients(
    directoryTab.value === 'mine' ? mine.value.filter(row => !filters.role || assignmentRole(row, directoryUser.value?.id ?? '') === filters.role) : data.clients,
    filters.query,
    filters.biz,
    filters.kind,
    filters.status,
    filters.person,
    filters.review,
  ),
)
const staff = computed(() =>
  data.staff.filter(
    (row) =>
      (row.name + row.login + row.email).toLowerCase().includes(filters.query.trim().toLowerCase()) &&
      (!filters.team || row.team === filters.team) &&
      (!filters.role || row.role === filters.role) &&
      (!filters.status || row.status === filters.status),
  ),
)
const activeStaff = computed(() => data.staff.filter((row) => row.status === '활성'))
const staffOptions = computed(() => data.staff.map(row => ({ id: row.id, name: row.name })))
const assignedClients = computed(() => {
  const id = selectedStaff.value?.id
  return id
    ? data.clients.filter(row => assignmentRole(row, id))
    : []
})
const modalTitle = computed(() =>
  modal.value === '담당자 지정' && selectedClient.value
    ? `담당자 지정 · ${selectedClient.value.name}`
    : modal.value,
)
const filteredActiveStaff = computed(() =>
  activeStaff.value.filter((row) => (row.name + row.team).includes(staffQuery.value.trim())),
)
let toastTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => [route.query.client, live.value] as const,
  ([id, liveMode]) => {
    if (props.page === 'clients')
      selectedClient.value = liveMode ? undefined : data.clients.find((row) => row.id === id && canOpenClient(row, directoryUser.value))
  },
  { immediate: true },
)

function closeClient() {
  selectedClient.value = undefined
  if (route.query.client) void router.replace({ path: route.path, query: { tab: directoryTab.value } })
}
function showToast(text: string) {
  clearTimeout(toastTimer)
  message.value = text
  toastTimer = setTimeout(() => {
    message.value = ''
  }, 2700)
}
function setFilter(key: keyof ManagementFilters, value: string) {
  filters[key] = value
}
function setField(key: string, value: string) {
  form[key] = value
}
function resetFilters() {
  filters.query = ''
  filters.biz = ''
  filters.kind = ''
  filters.status = ''
  filters.person = ''
  filters.review = ''
  filters.team = ''
  filters.role = ''
}
function open(title: string) {
  if (['수임업체 등록', '담당자 지정'].includes(title) && !admin.value) return
  clearTimeout(toastTimer)
  Object.keys(form).forEach((key) => delete form[key])
  const client = title === '담당자 지정' ? selectedClient.value : undefined
  Object.assign(form, {
    type: '개인',
    primary: client?.primaryId || activeStaff.value[0]?.id || '',
    team: '세무1팀',
    role: selectedStaff.value?.role || roles[1],
    status: '활성',
    start: '2026-11-17',
  })
  secondary.value = [...(client?.secondaryIds || [])]
  staffQuery.value = ''
  message.value = ''
  modal.value = title
}
function closeModal() {
  modal.value = ''
  message.value = ''
  Object.keys(form).forEach((key) => delete form[key])
}
function beginEdit() {
  clearTimeout(toastTimer)
  message.value = ''
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, props.page === 'mypage' ? rows.value.person : data.organization)
  editing.value = true
  setDirty(currentTab, true)
}
function normalizeProfileInput(key: string) { form[key] = formatProfileField(key, form[key]) }
function endEdit(save: boolean) {
  if (save) {
    if (props.page === 'mypage') {
      for (const key of editableProfile) normalizeProfileInput(key)
      if (!form.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) {
        message.value = '이름과 올바른 이메일을 입력해 주세요.'
        return
      }
      const previousName = rows.value.person.name
      for (const client of profileLive.value ? [] : data.clients) {
        if (client.primary === previousName) client.primary = form.name.trim()
        client.secondary = client.secondary.map((name) =>
          name === previousName ? form.name!.trim() : name,
        )
      }
      Object.assign(rows.value.person, {
        name: form.name.trim(),
        email: form.email!.trim(),
        phone: form.phone || '',
      })
    } else Object.assign(data.organization, form)
    showToast('변경사항을 화면에 저장했습니다. 새로고침하면 초기화됩니다.')
  } else message.value = ''
  editing.value = false
  setDirty(currentTab, false)
}
function changeTab(value: string) {
  if (editing.value) endEdit(false)
  tab.value = value
  resetFilters()
}
function save() {
  if (['수임업체 등록', '담당자 지정'].includes(modal.value) && !admin.value) return
  try {
    if (modal.value === '수임업체 등록') {
      if (!form.name?.trim() || !form.biz?.trim() || !form.ceo?.trim())
        throw new Error('업체명, 사업자등록번호, 대표자명을 입력해 주세요.')
      const assignment = assignById(data.staff, form.primary || '', secondary.value)
      const client: Client = {
        id: `C${String(data.clients.length + 1).padStart(3, '0')}`,
        name: form.name.trim(),
        biz: form.biz.trim(),
        ceo: form.ceo.trim(),
        type: form.type || '개인',
        ...assignment,
        status: '등록 대기',
        company: '검토 전',
        environment: '검토 전',
        chart: '검토 전',
        start: form.start || '',
        end: '',
        address: '주소 미입력',
      }
      data.clients.unshift(client)
      selectedClient.value = client
    } else if (modal.value === '담당자 지정' && selectedClient.value) {
      Object.assign(
        selectedClient.value,
        assignById(data.staff, form.primary || '', secondary.value),
      )
    } else if (modal.value === '직원 초대') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || ''))
        throw new Error('올바른 이메일을 입력해 주세요.')
      data.staff.push({
        id: `U${data.staff.length + 1}`,
        name: '초대 직원',
        login: '미설정',
        email: form.email!.trim(),
        team: form.team || '',
        title: form.title || '직원',
        role: form.role || roles[1]!,
        status: '초대 대기',
        joined: '2026-11-17',
      })
    } else if (modal.value === '직원 권한 변경' && selectedStaff.value)
      selectedStaff.value.role = form.role || roles[1]!
    else if (modal.value === '직원 계정 비활성화' && selectedStaff.value)
      selectedStaff.value.status = '비활성'
    else if (modal.value === '지점 추가' || modal.value === '사무소 수정') {
      if (!form.name?.trim()) throw new Error('지점명을 입력해 주세요.')
      const branch = data.branches.find((row) => row.id === branchId.value)
      const values = {
        name: form.name.trim(),
        address: form.address || '',
        phone: form.phone || '',
        status: form.status || '활성',
      }
      if (branch && modal.value === '사무소 수정') Object.assign(branch, values)
      else
        data.branches.push({
          id: `B${data.branches.length + 1}`,
          ...values,
          kind: '지점',
          count: '0',
        })
    } else {
      if (modal.value === '비밀번호 변경' && (!form.old || !form.new || form.new !== form.confirm))
        throw new Error('현재 비밀번호와 일치하는 새 비밀번호 확인을 입력해 주세요.')
      closeModal()
      showToast('보안 기능은 화면 시뮬레이션입니다. 실제 계정에는 적용되지 않습니다.')
      return
    }
    closeModal()
    showToast('화면 데이터에 반영했습니다. 새로고침하면 초기화됩니다.')
  } catch (error) {
    message.value = error instanceof Error ? error.message : '입력값을 확인해 주세요.'
  }
}
function editBranch(id: string) {
  branchId.value = id
  open('사무소 수정')
  Object.assign(
    form,
    data.branches.find((row) => row.id === id),
  )
}
async function go(id: ManagementDestination) {
  await navigate(id)
}
onBeforeUnmount(() => {
  clearTimeout(toastTimer)
  if (editing.value) setDirty(currentTab, false)
})
</script>

<template>
  <div class="page management" :class="{ narrow: page === 'mypage', 'management-live': live }">
    <template v-if="live">
      <NuxtLink class="small-link live-back" to="/client-directory">← 수임업체 관리 시안</NuxtLink>
      <ClientDirectory />
    </template>
    <template v-else>
      <header class="page-header">
        <div>
          <div class="eyebrow">{{ pageCopy[page][0] }}</div>
          <h1>{{ titles[page] }}</h1>
          <p class="sub">{{ pageCopy[page][1] }}</p>
        </div>
        <div v-if="page === 'clients'" class="actions">
          <button class="btn" @click="showToast('데이터는 프론트엔드 Mock Data입니다.')">
            ⓘ 화면 안내
          </button>
          <button v-if="admin" class="btn primary" @click="open('수임업체 등록')">+ 수임업체 등록</button>
        </div>
      </header>
      <template v-if="profileLive">
        <p v-if="profileLoading" role="status">내 정보를 불러오는 중입니다.</p>
        <p v-else-if="profileError" class="alert" role="alert">
          {{ profileError }} <button class="btn" @click="loadProfile">다시 시도</button>
        </p>
      </template>

      <nav v-if="page === 'clients'" class="tabs" aria-label="수임업체 조회 범위">
        <button :class="{ active: directoryTab === 'mine' }" :aria-pressed="directoryTab === 'mine'" @click="selectDirectoryTab('mine')">내 담당 업체</button>
        <button v-if="admin" :class="{ active: directoryTab === 'all' }" :aria-pressed="directoryTab === 'all'" @click="selectDirectoryTab('all')">전체 업체</button>
      </nav>
      <ManagementClientList v-if="page === 'clients'"
        :rows="rows" :filters="filters" :density="density" :staff-options="staffOptions" :loading="directoryLoading"
        :mine="directoryTab === 'mine'" :summary="summary" :user-id="directoryUser?.id || ''" :admin="admin" :selected-id="selectedClient?.id" :total="directoryTab === 'mine' ? mine.length : data.clients.length"
        @filter="setFilter" @reset="resetFilters" @select="selectClient" @work="openClientWork($event)"
      />

      <template v-else>
        <AssignedClientSummary v-if="page === 'mypage'" />
        <section v-if="page === 'mypage'" class="panel profile-banner">
          <span class="avatar big-avatar">{{ rows.person.name.charAt(0) }}</span>
          <div class="profile-heading">
            <h2>
              {{ rows.person.name }} <span class="profile-title">{{ rows.person.title }}</span>
            </h2>
            <div class="meta">
              <span>{{ rows.person.login }}</span
                  ><span>·</span><span>{{ rows.person.email }}</span
                  ><span>·</span><span>{{ rows.person.team }}</span>
            </div>
            <div class="profile-badges">
              <ManagementBadge :value="rows.person.role" /><ManagementBadge :value="rows.person.status" />
            </div>
          </div>
          <div class="spacer"></div>
          <span class="badge blue">{{ organizationName }}</span>
        </section>
        <section v-else class="panel org-header">
          <div class="org-emblem">원</div>
          <div>
            <h2>{{ organizationName }} <ManagementBadge value="활성" /></h2>
            <div class="org-meta">
              <span>사업자등록번호 {{ rows.organization['사업자등록번호'] }}</span>
              <span>대표 {{ rows.organization['대표자명'] }}</span>
              <span>본사 · 서울특별시 금천구</span>
            </div>
          </div>
          <span class="spacer"></span>
          <div class="org-num">
            <b>{{ formatAmount(rows.staff.length) }}</b
                ><span>소속 직원</span>
          </div>
          <div class="org-num">
            <b>{{ formatAmount(rows.clients.length) }}</b
                ><span>수임업체</span>
          </div>
          <button class="btn" :disabled="editing" @click="(changeTab('basic'), beginEdit())">
            조직 정보 수정
          </button>
        </section>

        <section class="panel">
          <nav class="tabs" :aria-label="titles[page] + ' 메뉴'">
            <template v-if="page === 'mypage'">
              <button
                :class="{ active: tab === 'info' }"
                :aria-pressed="tab === 'info'"
                @click="changeTab('info')"
                >내 정보</button>
              <button
                :class="{ active: tab === 'organization' }"
                :aria-pressed="tab === 'organization'"
                @click="changeTab('organization')"
                >소속 조직</button>
              <button
                :class="{ active: tab === 'security' }"
                :aria-pressed="tab === 'security'"
                @click="changeTab('security')"
                >보안 설정</button>
            </template>
            <template v-if="page === 'organization'">
              <button
                :class="{ active: tab === 'basic' }"
                :aria-pressed="tab === 'basic'"
                @click="changeTab('basic')"
                >조직 기본정보</button>
              <button
                :class="{ active: tab === 'staff' }"
                :aria-pressed="tab === 'staff'"
                @click="changeTab('staff')"
                >직원 관리</button>
              <button
                :class="{ active: tab === 'permissions' }"
                :aria-pressed="tab === 'permissions'"
                @click="changeTab('permissions')"
                >권한 관리</button>
              <button
                :class="{ active: tab === 'branches' }"
                :aria-pressed="tab === 'branches'"
                @click="changeTab('branches')"
                >본사/지점 관리</button>
            </template>
          </nav>
          <div class="tab-body" :class="{ 'org-tab-body': page === 'organization' }">
            <ManagementProfilePanel v-if="page === 'mypage'"
              :rows="rows" :tab="tab" :form="form" :editing="editing" :message="message"
              :edit-disabled="profileLive && (profileLoading || !!profileError)"
              @edit="beginEdit" @save="endEdit(true)" @cancel="endEdit(false)"
              @field="setField" @normalize="normalizeProfileInput" @open="open" @organization="go('organization')"
            />
            <ManagementOrganizationForm v-else-if="tab === 'basic'"
              :rows="rows" :form="form" :editing="editing"
              @edit="beginEdit" @save="endEdit(true)" @cancel="endEdit(false)" @field="setField"
            />
            <ManagementStaffList v-else-if="tab === 'staff'"
              :rows="rows" :filters="filters" :density="density"
              @filter="setFilter" @invite="open('직원 초대')" @select="selectedStaff = $event"
            />
            <ManagementPermissions v-else-if="tab === 'permissions'" />
            <ManagementBranches v-else :rows="rows" @add="open('지점 추가')" @edit="editBranch" />
          </div>
        </section>
      </template>
    </template>

    <ManagementClientDrawer v-if="selectedClient && !live" :client="selectedClient" :admin="admin"
      @close="closeClient" @assign="open('담당자 지정')" @navigate="clientDestination"
    />

    <ManagementStaffDrawer v-if="selectedStaff" :staff="selectedStaff"
      :organization-name="organizationName" :assigned-clients="assignedClients"
      @close="selectedStaff = undefined" @role="open('직원 권한 변경')" @deactivate="open('직원 계정 비활성화')"
    />

    <ManagementActionDialog v-if="modal"
      :modal="modal" :title="modalTitle" :form="form" :secondary="secondary" :staff-query="staffQuery"
      :active-staff="activeStaff" :filtered-active-staff="filteredActiveStaff"
      :selected-staff="selectedStaff" :message="message"
      @close="closeModal" @save="save" @field="setField"
      @update:secondary="secondary = $event" @update:staff-query="staffQuery = $event" @message="message = $event"
    />
    <p v-if="message && !modal && !editing" role="status" class="toast management-toast">
      {{ message }}
    </p>
  </div>
</template>

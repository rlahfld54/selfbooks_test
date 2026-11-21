<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/authStore'
import { formatNumber } from '~/utils/number-validation'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { managementSession } from '~/features/management/session'
import { usePermissionStore } from '~/stores/permissionStore'
import { assignmentRole } from '~/features/management/assignments'
import type { Staff } from '~/features/management/data'
import ManagementBadge from '~/features/management/ManagementBadge.vue'
import { formatAmount } from '~/utils/formatAmount'
import ManagementOrganizationForm from '~/features/management/components/ManagementOrganizationForm.vue'
import ManagementStaffList from '~/features/management/components/ManagementStaffList.vue'
import ManagementPermissions from '~/features/management/components/ManagementPermissions.vue'
import ManagementBranches from '~/features/management/components/ManagementBranches.vue'
import ManagementStaffDrawer from '~/features/management/components/ManagementStaffDrawer.vue'
import ManagementActionDialog from '~/features/management/components/ManagementActionDialog.vue'
import type { ManagementFilters } from '~/features/management/view-types'

const authStore = useAuthStore()
const { userInfo } = storeToRefs(authStore)
const { pagesPreview } = useRuntimeConfig().public

definePageMeta({ workspaceTab: 'organization' })
const { state, activeTab, setDirty, density } = useWorkspaceContext()
const data = managementSession(state)
const permissions = usePermissionStore().forScope(state)
const roles = permissions.roles
const currentTab = activeTab.value
const modal = ref('')
const message = ref('')
const form = reactive<Record<string, string>>({})
const secondary = ref<string[]>([])
const staffQuery = ref('')
const editing = ref(false)
const activeStaff = computed(() => data.staff.filter((row) => row.status === '활성'))
const filteredActiveStaff = computed(() =>
  activeStaff.value.filter((row) => (row.name + row.team).includes(staffQuery.value.trim())),
)
let toastTimer: ReturnType<typeof setTimeout> | undefined
const tab = ref('basic')
const filters = reactive<ManagementFilters>({
  query: '',
  biz: '',
  kind: '',
  status: '',
  person: '',
  review: '',
  team: '',
  role: '',
})
function setFilter(key: keyof ManagementFilters, value: string) {
  filters[key] = value
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
const selectedStaff = ref<Staff>()
const branchId = ref('')
const staff = computed(() =>
  data.staff.filter(
    (row) =>
      (row.name + row.login + row.email)
        .toLowerCase()
        .includes(filters.query.trim().toLowerCase()) &&
      (!filters.team || row.team === filters.team) &&
      (!filters.role || row.role === filters.role) &&
      (!filters.status || row.status === filters.status),
  ),
)
const assignedClients = computed(() => {
  const id = selectedStaff.value?.id
  return id ? data.clients.filter((row) => assignmentRole(row, id)) : []
})
const rows = computed(() => ({ ...data, filteredStaff: staff.value }))
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
function beginEdit() {
  clearTimeout(toastTimer)
  message.value = ''
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, data.organization)
  if (!pagesPreview)
    Object.assign(form, {
      '회계법인명/사무소명': userInfo.value?.organization?.name ?? '',
      사업자등록번호: userInfo.value?.organization?.business_registration_number ?? '',
      법인등록번호: userInfo.value?.organization?.corporate_registration_number ?? '',
      대표자명: userInfo.value?.organization?.representative_name ?? '',
      '사업장 주소': userInfo.value?.organization?.address ?? '',
      업태: userInfo.value?.organization?.business_type ?? '',
      종목: userInfo.value?.organization?.business_item ?? '',
      대표전화: userInfo.value?.organization?.phone ?? '',
      '대표 이메일': userInfo.value?.organization?.email ?? '',
    })
  editing.value = true
  setDirty(currentTab, true)
}
function endEdit(save: boolean) {
  if (save) {
    Object.assign(data.organization, {
      ...form,
      사업자등록번호: formatNumber('business', form['사업자등록번호']),
      법인등록번호: formatNumber('corporation', form['법인등록번호']),
      대표전화: formatNumber('phone', form['대표전화']),
      팩스번호: formatNumber('phone', form['팩스번호']),
    })
    if (!pagesPreview && userInfo.value?.organization) {
      authStore.setUser({
        ...userInfo.value,
        organization: {
          ...userInfo.value.organization,
          name: data.organization['회계법인명/사무소명'] ?? '',
          business_registration_number: data.organization['사업자등록번호'] ?? '',
          corporate_registration_number: data.organization['법인등록번호'] ?? '',
          representative_name: data.organization['대표자명'] ?? '',
          address: data.organization['사업장 주소'] ?? '',
          business_type: data.organization['업태'] ?? '',
          business_item: data.organization['종목'] ?? '',
          phone: data.organization['대표전화'] ?? '',
          email: data.organization['대표 이메일'] ?? '',
        },
      })
    }
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
function open(title: string) {
  clearTimeout(toastTimer)
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, {
    type: '개인',
    team: '세무1팀',
    role: selectedStaff.value?.role || roles[1],
    status: '활성',
    start: '2026-11-17',
  })
  secondary.value = []
  staffQuery.value = ''
  message.value = ''
  modal.value = title
}
function save() {
  try {
    if (modal.value === '직원 초대') {
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
onBeforeUnmount(() => {
  clearTimeout(toastTimer)
  if (editing.value) setDirty(currentTab, false)
})
</script>

<template>
  <div class="page management">
    <section class="panel org-header">
      <div class="org-emblem">로고</div>
      <div>
        <h2>
          {{ userInfo?.organization?.name || '—' }}
          <ManagementBadge value="활성" />
        </h2>
        <div class="org-meta">
          <span>
            사업자등록번호
            {{
              formatNumber('business', userInfo?.organization?.business_registration_number) || '—'
            }}
          </span>
          <span>대표 {{ userInfo?.organization?.representative_name || '—' }}</span>
          <span>{{ userInfo?.organization?.address || '—' }}</span>
        </div>
      </div>
      <span class="spacer"></span>
      <div class="org-num">
        <b>
          {{ formatAmount(rows.staff.length) }}
        </b>
        <span>소속 직원</span>
      </div>
      <div class="org-num">
        <b>
          {{ formatAmount(rows.clients.length) }}
        </b>
        <span>수임업체</span>
      </div>
      <button class="btn" :disabled="editing" @click="(changeTab('basic'), beginEdit())">
        조직 정보 수정
      </button>
    </section>
    <section class="panel">
      <nav class="tabs" aria-label="조직 설정 메뉴">
        <button
          :class="{ active: tab === 'basic' }"
          :aria-pressed="tab === 'basic'"
          @click="changeTab('basic')">
          조직 기본정보
        </button>
        <button
          :class="{ active: tab === 'staff' }"
          :aria-pressed="tab === 'staff'"
          @click="changeTab('staff')">
          직원 관리
        </button>
        <button
          :class="{ active: tab === 'permissions' }"
          :aria-pressed="tab === 'permissions'"
          @click="changeTab('permissions')">
          권한 관리
        </button>
        <button
          :class="{ active: tab === 'branches' }"
          :aria-pressed="tab === 'branches'"
          @click="changeTab('branches')">
          본사/지점 관리
        </button>
      </nav>

      <div class="tab-body org-tab-body">
        <ManagementOrganizationForm
          v-if="tab === 'basic'"
          :rows="rows"
          :form="form"
          :editing="editing"
          @edit="beginEdit"
          @save="endEdit(true)"
          @cancel="endEdit(false)"
          @field="setField" />
        <ManagementStaffList
          v-else-if="tab === 'staff'"
          :rows="rows"
          :filters="filters"
          :density="density"
          @filter="setFilter"
          @invite="open('직원 초대')"
          @select="selectedStaff = $event" />
        <ManagementPermissions v-else-if="tab === 'permissions'" />
        <ManagementBranches v-else :rows="rows" @add="open('지점 추가')" @edit="editBranch" />
      </div>
    </section>
    <ManagementStaffDrawer
      v-if="selectedStaff"
      :staff="selectedStaff"
      :organization-name="userInfo?.organization?.name || '—'"
      :assigned-clients="assignedClients"
      @close="selectedStaff = undefined"
      @role="open('직원 권한 변경')"
      @deactivate="open('직원 계정 비활성화')" />
    <ManagementActionDialog
      v-if="modal"
      :modal="modal"
      :title="modal"
      :form="form"
      :secondary="secondary"
      :staff-query="staffQuery"
      :active-staff="activeStaff"
      :filtered-active-staff="filteredActiveStaff"
      :selected-staff="selectedStaff"
      :message="message"
      @close="closeModal"
      @save="save"
      @field="setField"
      @update:secondary="secondary = $event"
      @update:staff-query="staffQuery = $event"
      @message="message = $event" />
    <p v-if="message && !modal && !editing" role="status" class="toast management-toast">
      {{ message }}
    </p>
  </div>
</template>

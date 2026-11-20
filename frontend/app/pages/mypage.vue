<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { managementSession } from '~/features/management/session'
import AssignedClientSummary from '~/features/management/components/AssignedClientSummary.vue'
import ManagementBadge from '~/features/management/ManagementBadge.vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/authStore'
import { mapProfile } from '~/features/management/profile-mapping'
import { formatProfileField } from '~/features/management/profile-format'
import ManagementProfilePanel from '~/features/management/components/ManagementProfilePanel.vue'
import ManagementActionDialog from '~/features/management/components/ManagementActionDialog.vue'
import type { ManagementDestination } from '~/features/management/view-types'

definePageMeta({ workspaceTab: 'mypage' })

const { state, navigate, activeTab, setDirty } = useWorkspaceContext()

const data = managementSession(state)
const currentTab = activeTab.value
const pageState = reactive({
  tab: 'info',
  modal: '',
  message: '',
  editing: false,
  form: {} as Record<string, string>,
  secondary: [] as string[],
  staffQuery: '',
  profile: {
    saved: {} as Record<string, string>,
  },
})
const activeStaff = computed(() => data.staff.filter((row) => row.status === '활성'))
const filteredActiveStaff = computed(() =>
  activeStaff.value.filter((row) => (row.name + row.team).includes(pageState.staffQuery.trim())),
)
let toastTimer: ReturnType<typeof setTimeout> | undefined
const {
  public: { pagesPreview },
} = useRuntimeConfig()
const profileLive = computed(() => !pagesPreview)
const { user } = storeToRefs(useAuthStore())
const previewRows = computed(() => pagesPreview
  ? { person: data.staff[0]!, organization: data.organization }
  : undefined)
const rows = computed(() => {
  const source = previewRows.value ?? mapProfile(user.value?.organization
    ? { user: user.value, office: user.value.organization }
    : undefined)
  return { ...source, person: { ...source.person, ...pageState.profile.saved } }
})
function showToast(text: string) {
  clearTimeout(toastTimer)
  pageState.message = text
  toastTimer = setTimeout(() => {
    pageState.message = ''
  }, 2700)
}
function setField(key: string, value: string) {
  pageState.form[key] = value
}
function closeModal() {
  pageState.modal = ''
  pageState.message = ''
  Object.keys(pageState.form).forEach((key) => delete pageState.form[key])
}
function beginEdit() {
  clearTimeout(toastTimer)
  pageState.message = ''
  Object.keys(pageState.form).forEach((key) => delete pageState.form[key])
  Object.assign(pageState.form, rows.value.person)
  pageState.editing = true
  setDirty(currentTab, true)
}
function normalizeProfileInput(key: string) {
  pageState.form[key] = formatProfileField(key, pageState.form[key])
}
function endEdit(save: boolean) {
  if (save) {
    normalizeProfileInput('name')
    normalizeProfileInput('email')
    normalizeProfileInput('phone')
    if (
      !pageState.form.name?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pageState.form.email || '')
    ) {
      pageState.message = '이름과 올바른 이메일을 입력해 주세요.'
      return
    }
    const previousName = rows.value.person.name
    for (const client of profileLive.value ? [] : data.clients) {
      if (client.primary === previousName) client.primary = pageState.form.name.trim()
      client.secondary = client.secondary.map((name) =>
        name === previousName ? pageState.form.name!.trim() : name,
      )
    }
    Object.assign(profileLive.value ? pageState.profile.saved : data.staff[0]!, {
      name: pageState.form.name.trim(),
      email: pageState.form.email!.trim(),
      phone: pageState.form.phone || '',
    })
    showToast('변경사항을 화면에 저장했습니다. 새로고침하면 초기화됩니다.')
  } else pageState.message = ''
  pageState.editing = false
  setDirty(currentTab, false)
}
function changeTab(value: string) {
  if (pageState.editing) endEdit(false)
  pageState.tab = value
}
function open(title: string) {
  clearTimeout(toastTimer)
  Object.keys(pageState.form).forEach((key) => delete pageState.form[key])
  pageState.message = ''
  pageState.modal = title
}
function save() {
  if (
    pageState.modal === '비밀번호 변경' &&
    (!pageState.form.old || !pageState.form.new || pageState.form.new !== pageState.form.confirm)
  ) {
    pageState.message = '현재 비밀번호와 일치하는 새 비밀번호 확인을 입력해 주세요.'
    return
  }
  closeModal()
  showToast('보안 기능은 화면 시뮬레이션입니다. 실제 계정에는 적용되지 않습니다.')
}
async function go(id: ManagementDestination) {
  await navigate(id)
}
onBeforeUnmount(() => {
  clearTimeout(toastTimer)
  if (pageState.editing) setDirty(currentTab, false)
})
</script>

<template>
  <div class="page management narrow">
    <header class="page-header">
      <div>
        <div class="eyebrow">MY ACCOUNT</div>
        <h1>마이페이지</h1>
        <p class="sub">내 계정 정보와 소속 조직, 보안 설정을 관리합니다.</p>
      </div>
    </header>
    <AssignedClientSummary />
    <section class="panel profile-banner">
      <span class="avatar big-avatar">
        {{ rows.person.name.charAt(0) }}
      </span>
      <div class="profile-heading">
        <h2>
          {{ rows.person.name }}
          <span class="profile-title">
            {{ rows.person.title }}
          </span>
        </h2>
        <div class="meta">
          <span>
            {{ rows.person.login }}
          </span>
          <span>·</span>
          <span>
            {{ rows.person.email }}
          </span>
          <span>·</span>
          <span>
            {{ rows.person.team }}
          </span>
        </div>
        <div class="profile-badges">
          <ManagementBadge :value="rows.person.role" />
          <ManagementBadge :value="rows.person.status" />
        </div>
      </div>
      <div class="spacer"></div>
      <span class="badge blue">
        {{ rows.organization['회계법인명/사무소명'] || '—' }}
      </span>
    </section>

    <section class="panel">
      <nav class="tabs" aria-label="마이페이지 메뉴">
        <button
          :class="{ active: pageState.tab === 'info' }"
          :aria-pressed="pageState.tab === 'info'"
          @click="changeTab('info')">
          내 정보
        </button>
        <button
          :class="{ active: pageState.tab === 'organization' }"
          :aria-pressed="pageState.tab === 'organization'"
          @click="changeTab('organization')">
          소속 조직
        </button>
        <button
          :class="{ active: pageState.tab === 'security' }"
          :aria-pressed="pageState.tab === 'security'"
          @click="changeTab('security')">
          보안 설정
        </button>
      </nav>

      <div class="tab-body">
        <ManagementProfilePanel
          :preview-rows="previewRows"
          :display-edits="pageState.profile.saved"
          :tab="pageState.tab"
          :form="pageState.form"
          :editing="pageState.editing"
          :message="pageState.message"
          :edit-disabled="profileLive && !user"
          @edit="beginEdit"
          @save="endEdit(true)"
          @cancel="endEdit(false)"
          @field="setField"
          @normalize="normalizeProfileInput"
          @open="open"
          @organization="go('organization')" />
      </div>
    </section>
    <ManagementActionDialog
      v-if="pageState.modal"
      :modal="pageState.modal"
      :title="pageState.modal"
      :form="pageState.form"
      :secondary="pageState.secondary"
      :staff-query="pageState.staffQuery"
      :active-staff="activeStaff"
      :filtered-active-staff="filteredActiveStaff"
      :message="pageState.message"
      @close="closeModal"
      @save="save"
      @field="setField"
      @update:secondary="pageState.secondary = $event"
      @update:staff-query="pageState.staffQuery = $event"
      @message="pageState.message = $event" />
    <p
      v-if="pageState.message && !pageState.modal && !pageState.editing"
      role="status"
      class="toast management-toast">
      {{ pageState.message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { managementSession } from '~/features/management/session'
import AssignedClientSummary from '~/features/management/components/AssignedClientSummary.vue'
import ManagementBadge from '~/features/management/ManagementBadge.vue'
import { useBackendApi } from '~/composables/useBackendApi'
import { createProfileService } from '~/features/management/profile-service'
import { mapProfile } from '~/features/management/profile-mapping'
import { formatProfileField } from '~/features/management/profile-format'
import ManagementProfilePanel from '~/features/management/components/ManagementProfilePanel.vue'
import ManagementActionDialog from '~/features/management/components/ManagementActionDialog.vue'
import type { ManagementDestination } from '~/features/management/view-types'

definePageMeta({ workspaceTab: 'mypage' })

const { state, navigate, activeTab, setDirty } = useWorkspaceContext()

const data = managementSession(state)
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
const tab = ref('info')
const {
  public: { pagesPreview },
} = useRuntimeConfig()
const profileLive = computed(() => !pagesPreview)
const profileService = createProfileService(useBackendApi())
const mappedProfile = ref(mapProfile())
const profileLoading = ref(false)
const profileError = ref('')
let profileController: AbortController | undefined
const rows = computed(() => ({
  person: profileLive.value ? mappedProfile.value.person : data.staff[0]!,
  organization: profileLive.value ? mappedProfile.value.organization : data.organization,
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
    if (!current.signal.aborted)
      profileError.value = error instanceof Error ? error.message : '내 정보를 불러오지 못했습니다.'
  } finally {
    if (profileController === current) profileLoading.value = false
  }
}
onMounted(() => {
  if (profileLive.value) void loadProfile()
})
onBeforeUnmount(() => profileController?.abort())
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
  Object.assign(form, rows.value.person)
  editing.value = true
  setDirty(currentTab, true)
}
function normalizeProfileInput(key: string) {
  form[key] = formatProfileField(key, form[key])
}
function endEdit(save: boolean) {
  if (save) {
    normalizeProfileInput('name')
    normalizeProfileInput('email')
    normalizeProfileInput('phone')
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
    showToast('변경사항을 화면에 저장했습니다. 새로고침하면 초기화됩니다.')
  } else message.value = ''
  editing.value = false
  setDirty(currentTab, false)
}
function changeTab(value: string) {
  if (editing.value) endEdit(false)
  tab.value = value
}
function open(title: string) {
  clearTimeout(toastTimer)
  Object.keys(form).forEach((key) => delete form[key])
  message.value = ''
  modal.value = title
}
function save() {
  if (modal.value === '비밀번호 변경' && (!form.old || !form.new || form.new !== form.confirm)) {
    message.value = '현재 비밀번호와 일치하는 새 비밀번호 확인을 입력해 주세요.'
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
  if (editing.value) setDirty(currentTab, false)
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
    <template v-if="profileLive">
      <p v-if="profileLoading" role="status">내 정보를 불러오는 중입니다.</p>
      <p v-else-if="profileError" class="alert" role="alert">
        {{ profileError }}
        <button class="btn" @click="loadProfile">다시 시도</button>
      </p>
    </template>
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
          :class="{ active: tab === 'info' }"
          :aria-pressed="tab === 'info'"
          @click="changeTab('info')">
          내 정보
        </button>
        <button
          :class="{ active: tab === 'organization' }"
          :aria-pressed="tab === 'organization'"
          @click="changeTab('organization')">
          소속 조직
        </button>
        <button
          :class="{ active: tab === 'security' }"
          :aria-pressed="tab === 'security'"
          @click="changeTab('security')">
          보안 설정
        </button>
      </nav>

      <div class="tab-body">
        <ManagementProfilePanel
          :rows="rows"
          :tab="tab"
          :form="form"
          :editing="editing"
          :message="message"
          :edit-disabled="profileLive && (profileLoading || !!profileError)"
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
      v-if="modal"
      :modal="modal"
      :title="modal"
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
    <p v-if="message && !modal && !editing" role="status" class="toast management-toast">
      {{ message }}
    </p>
  </div>
</template>

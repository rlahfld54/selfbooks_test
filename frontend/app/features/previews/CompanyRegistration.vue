<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useBackendApi } from '~/composables/useBackendApi'
import { applyOfficeRegistration, type OfficeRegistration } from './officeRegistrationData'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { companyRegistrationSession } from './registrationSession'
import RegistrationReviewForm from './RegistrationReviewForm.vue'
import { editRegistrationField, confirmRegistrationSection } from './registrationReview'
const { activeTab, navigate, setDirty } = useWorkspaceContext()
const session = companyRegistrationSession(activeTab.value)
const request = useBackendApi()
const loading = ref(false)
const error = ref('')
const controller = new AbortController()
async function load() {
  if (session.loaded || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await request<OfficeRegistration>('/office-registration', controller.signal)
    if (controller.signal.aborted) return
    applyOfficeRegistration(session, data)
    session.officeName = data.name ?? ''
    session.loaded = true
  } catch {
    if (!controller.signal.aborted) error.value = '사무소 정보를 불러오지 못했습니다. 백엔드 실행 상태와 서버의 사무소 ID 설정을 확인해 주세요.'
  } finally { loading.value = false }
}
onMounted(load)
onBeforeUnmount(() => controller.abort())
const sections = {
  기본정보: ['회사명', '사업자등록번호', '법인등록번호', '주소', '업태', '종목'],
  대표자정보: ['대표자명', '공동대표자', '연락처'],
  사업장정보: ['본점', '지점', '추가사업장'],
  세무정보: ['과세유형', '관할세무서', '담당자', '환급계좌'],
  '첨부/메모': ['업무메모'],
} as const
function edit(section: string, field: string, value: string) {
  if (editRegistrationField(session, section, field, value)) setDirty(activeTab.value)
}
function confirm(section: string, value: boolean) {
  confirmRegistrationSection(session, section, value)
  setDirty(activeTab.value)
}
</script>

<template>
  <div>
    <PageToolbar title="회사등록" description="수집된 회사정보를 위에서부터 검토하고 필요한 내용을 수정하세요.">
      <template #eyebrow>기초정보관리</template>
      <UiBadge tone="neutral">정보 검토 및 수정</UiBadge>
      <UiButton @click="navigate('clients')">수임업체 목록 조회</UiButton>
    </PageToolbar>
    <p class="info-banner">사무소 정보: {{ session.officeName || '조회 중' }} · 서버에 지정된 사무소의 DB 정보를 표시합니다.</p>
    <p v-if="loading" role="status">사무소 정보를 불러오는 중입니다.</p>
    <div v-if="error" role="alert"><p>{{ error }}</p><UiButton @click="load">다시 조회</UiButton></div>
    <RegistrationReviewForm v-if="session.loaded" prefix="company-field" :sections="sections" :review="session" source-notice="DB에 저장된 사무소 정보를 불러왔습니다. 화면에서 수정한 내용과 검토 체크는 열린 탭에서만 유지되며 DB에 저장되지 않습니다." @edit="edit" @confirm="confirm" />
    <div class="section-switcher section-gap" aria-label="최초 설정 안내">
      <span>다음 설정</span><UiButton @click="navigate('settings')">환경등록</UiButton><UiButton @click="navigate('accounts')">계정과목 및 적요관리</UiButton>
    </div>
  </div>
</template>

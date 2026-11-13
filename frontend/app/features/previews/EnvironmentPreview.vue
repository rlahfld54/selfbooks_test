<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { environmentSession, environmentSections as sections } from './usePreviewSession'
import RegistrationReviewForm from './RegistrationReviewForm.vue'
import { editRegistrationField, confirmRegistrationSection } from './registrationReview'
const { activeTab, setDirty } = useWorkspaceContext()
const session = environmentSession(activeTab.value)
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
    <PageToolbar title="환경등록" description="수집된 세무처리 기준과 자동화 설정을 순서대로 검토하고 수정하세요.">
      <template #eyebrow>기초정보관리</template>
      <UiBadge tone="neutral">정보 검토 및 수정</UiBadge>
    </PageToolbar>
    <RegistrationReviewForm prefix="business-setting" :sections="sections" :review="session" @edit="edit" @confirm="confirm" />
  </div>
</template>

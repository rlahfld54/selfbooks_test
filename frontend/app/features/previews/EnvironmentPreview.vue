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
  <RegistrationReviewForm
    prefix="business-setting"
    :sections="sections"
    :review="session"
    @edit="edit"
    @confirm="confirm" />
</template>

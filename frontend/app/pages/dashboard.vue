<script setup lang="ts">
import HomeDashboard from '~/features/home/HomeDashboard.vue'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { tabInfo } from '~/utils/workspace-routes'
definePageMeta({ workspaceTab: 'home' })
const { company, navigate, resumeTab } = useWorkspaceContext()
</script>

<template>
  <div v-if="resumeTab" class="info-banner">
    <span>마지막으로 열었던 업무: {{ tabInfo(resumeTab).title }}</span>
    <UiButton @click="navigate(resumeTab, 'tab')">이어서 열기</UiButton>
  </div>
  <HomeDashboard :company="company" @open="navigate($event)" />
</template>

<script setup lang="ts">
import { companies } from '~/features/workspace/stores/workspace'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { useMockAuth } from '~/features/auth/useMockAuth'
defineProps<{ title: string; inert: boolean }>()
const emit = defineEmits<{ 'toggle-menu': [] }>()
const { company, requestCompany } = useWorkspaceContext()
const notifications = ref(false)
const { user, logout } = useMockAuth()
const router = useRouter()
async function signOut() {
  // Existing workspace guard confirms unsaved changes before clearing the demo session.
  const failure = await router.push('/login')
  if (!failure) logout()
}
</script>
<template>
  <header class="app-header" :inert="inert">
        <div class="header-left">
          <UiButton
            class="mobile-toggle"
            variant="ghost"
            aria-label="메뉴 열기"
            @click="emit('toggle-menu')"
            ><UiIcon name="menu" /></UiButton
          ><UiIcon name="home" :size="17" /><span class="breadcrumb-separator">/</span
          ><span>{{ title }}</span>
        </div>
        <div class="header-right">
          <UiSelect
            aria-label="샘플 회사 선택"
            :model-value="company"
            :options="companies"
            @update:model-value="requestCompany($event)"
          /><span class="header-divider" /><UiButton
            variant="ghost"
            aria-label="알림 보기"
            @click="notifications = true"
            ><span class="notification-icon"><UiIcon name="bell" /><i /></span
          ></UiButton>
          <div class="user-avatar">{{ user?.name.slice(0, 1) || '관' }}</div>
          <span class="user-label">{{ user?.name || '관리자' }} <small>데모 계정</small></span>
          <UiButton variant="ghost" @click="signOut">로그아웃</UiButton>
        </div>
      </header>
  <UiModal :open="notifications" title="알림" @close="notifications = false">
    <EmptyState title="새로운 알림이 없습니다" description="현재 UI 데모에서는 실제 알림을 수신하지 않습니다." />
  </UiModal>
</template>

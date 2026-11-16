<script setup lang="ts">
import { companies } from '~/features/workspace/stores/workspace'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import SocialAuthButtons from '~/features/auth/SocialAuthButtons.vue'
import { useAuth, type SocialProvider } from '~/features/auth/useAuth'
defineProps<{ title: string; inert: boolean }>()
const emit = defineEmits<{ 'toggle-menu': [] }>()
const { company, requestCompany } = useWorkspaceContext()
const notifications = ref(false)
const { user, logout, startSocialAuth } = useAuth()
const router = useRouter()
const socialOpen = ref(false)
const socialBusy = ref(false)
const socialError = ref('')

function openSocialLinks() {
  socialError.value = ''
  socialOpen.value = true
}

async function linkSocialAccount(provider: SocialProvider) {
  if (socialBusy.value) return
  socialError.value = ''
  socialBusy.value = true
  try {
    socialError.value = await startSocialAuth(provider)
  } catch {
    socialError.value = 'SNS 계정을 연결하지 못했습니다. 연결 상태를 확인해 주세요.'
  } finally {
    socialBusy.value = false
  }
}

async function signOut() {
  // Confirm unsaved changes before clearing the authenticated session.
  const failure = await router.push('/login')
  if (!failure) await logout()
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
          <button v-if="user" type="button" class="user-avatar social-account-button" title="SNS 계정 연결" aria-label="SNS 계정 연결" @click="openSocialLinks">{{ user.name.slice(0, 1) }}</button>
          <div v-else class="user-avatar">관</div>
          <span class="user-label">{{ user?.name || '관리자' }} <small>{{ user ? '관리자' : '미리보기' }}</small></span>
          <UiButton variant="ghost" @click="signOut">로그아웃</UiButton>
        </div>
      </header>
  <UiModal :open="notifications" title="알림" @close="notifications = false">
    <EmptyState title="새로운 알림이 없습니다" description="현재 UI 데모에서는 실제 알림을 수신하지 않습니다." />
  </UiModal>
  <UiModal :open="socialOpen" title="SNS 계정 연결" @close="socialOpen = false">
    <div class="social-account-content">
      <p>현재 로그인한 SelfBooks 계정에 연결할 SNS를 선택해 주세요.</p>
      <SocialAuthButtons action="연결" :disabled="socialBusy" @select="linkSocialAccount" />
      <p v-if="socialError" role="alert">{{ socialError }}</p>
    </div>
  </UiModal>
</template>

<style scoped>
.social-account-button {
  border: 0;
  cursor: pointer;
}

.social-account-button:focus-visible {
  outline: 2px solid #4773bb;
  outline-offset: 2px;
}

.social-account-content {
  display: grid;
  gap: 14px;
}
</style>

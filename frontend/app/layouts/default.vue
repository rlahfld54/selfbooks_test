<script setup lang="ts">
import WorkspaceLayout from '~/features/workspace/components/WorkspaceLayout.vue'
import { useAuth } from '~/features/auth/useAuth'

const { user, restoreIssue, verifying, restore } = useAuth()
const { pagesPreview } = useRuntimeConfig().public
const router = useRouter()

async function retryAccess() {
  await restore()
  if (!user.value && !restoreIssue.value) await router.replace('/login')
}
</script>

<template>
  <ClientOnly>
    <WorkspaceLayout v-if="user || pagesPreview" :key="user?.id">
      <slot />
    </WorkspaceLayout>
    <main v-else class="page-content">
      <LoadingState v-if="verifying" />
      <ErrorState v-else-if="restoreIssue" :message="restoreIssue" @retry="retryAccess" />
      <NuxtLink to="/login">로그인 화면으로</NuxtLink>
    </main>
  </ClientOnly>
</template>

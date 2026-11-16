<script setup lang="ts">
import { useAuth } from '~/features/auth/useAuth'

definePageMeta({ layout: 'auth' })
useHead({ title: '간편 로그인 · Accounting Pro' })

const route = useRoute()
const router = useRouter()
const { finishSocialAuth } = useAuth()
const error = ref('')

onMounted(async () => {
  const { code, error: callbackError, error_code: callbackErrorCode } = route.query
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const providerError = callbackError || callbackErrorCode || fragment.get('error') || fragment.get('error_code')

  try {
    if (providerError) {
      error.value = 'SNS 인증이 취소됐거나 실패했습니다. 로그인 화면에서 다시 시도해 주세요.'
    } else if (typeof code === 'string' && code) {
      error.value = await finishSocialAuth(code)
      if (!error.value) {
        await router.replace('/dashboard')
        return
      }
    } else {
      error.value = '인증 요청을 확인할 수 없습니다. 로그인 화면에서 다시 시도해 주세요.'
    }
  } catch {
    error.value = 'SNS 인증을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.'
  }
  await router.replace('/auth/callback')
})
</script>

<template>
  <div class="auth-form-heading"><h1>간편 로그인</h1></div>
  <div v-if="error" class="entry-form">
    <p class="entry-error" role="alert">{{ error }}</p>
    <NuxtLink to="/login" class="entry-button primary full" replace>로그인 화면으로</NuxtLink>
  </div>
  <p v-else class="entry-notice" role="status">SNS 인증과 업무 접근 권한을 확인하고 있습니다.</p>
</template>

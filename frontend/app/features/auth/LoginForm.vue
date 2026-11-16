<script setup lang="ts">
import { ref } from 'vue'
import PasswordField from './PasswordField.vue'
import SocialAuthButtons from './SocialAuthButtons.vue'
import { useAuth, type SocialProvider } from './useAuth'
const router = useRouter()
const { login, startSocialAuth, warning } = useAuth()
const email = ref('')
const password = ref('')
const remember = ref(false)
const error = ref('')
const busy = ref(false)
const socialBusy = ref(false)
const socialError = ref('')
async function submit() {
  if (busy.value || socialBusy.value) return
  busy.value = true
  error.value = ''
  socialError.value = ''
  try {
    error.value = await login(email.value, password.value, remember.value)
    if (!error.value) { password.value = ''; await router.push('/dashboard') }
  } catch { error.value = '로그인 처리 중 문제가 발생했습니다. 브라우저 저장소와 연결 상태를 확인해 주세요.' }
  finally { busy.value = false }
}

async function submitSocial(provider: SocialProvider) {
  if (busy.value || socialBusy.value) return
  socialBusy.value = true
  error.value = ''
  socialError.value = ''
  warning.value = ''
  try {
    socialError.value = await startSocialAuth(provider, remember.value)
  } catch {
    socialError.value = '간편 로그인을 시작하지 못했습니다. 브라우저 저장소와 연결 상태를 확인해 주세요.'
  } finally {
    socialBusy.value = false
  }
}
</script>
<template>
  <div class="auth-form-heading"><span class="section-kicker">WELCOME BACK</span><h1>다시 오신 것을 환영합니다.</h1><p>AAT에 로그인하고<br />업무를 이어서 진행하세요.</p></div>
  <p v-if="warning" class="entry-notice" role="status">{{ warning }}</p>
  <form class="entry-form" @submit.prevent="submit">
    <div><label class="entry-field" for="login-email">이메일</label><input id="login-email" v-model="email" type="email" required autocomplete="username" placeholder="name@company.com" /></div>
    <div><PasswordField id="login-password" v-model="password" label="비밀번호" /></div>
    <div class="auth-form-options"><label><input v-model="remember" :disabled="busy || socialBusy" type="checkbox" />로그인 상태 유지</label><NuxtLink to="/forgot-password">비밀번호 찾기</NuxtLink></div>
    <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
    <button class="entry-button primary full" :disabled="busy || socialBusy" type="submit">{{ busy ? '로그인 중…' : '로그인' }}<UiIcon name="arrow" :size="17" /></button>
  </form>
  <section class="social-login" aria-labelledby="social-login-heading">
    <h2 id="social-login-heading">SNS 간편 로그인</h2>
    <SocialAuthButtons action="로그인" :disabled="busy || socialBusy" @select="submitSocial" />
    <p v-if="socialError" class="entry-error" role="alert">{{ socialError }}</p>
  </section>
  <p class="auth-switch">아직 계정이 없으신가요? <NuxtLink to="/register">회원가입</NuxtLink></p>
  <p class="auth-register-note">등록된 관리자 계정으로 로그인해 주세요.</p>
</template>

<style scoped>
.social-login {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

.social-login h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #586c87;
  font-size: 12px;
  font-weight: 600;
}

.social-login h2::before,
.social-login h2::after {
  flex: 1;
  height: 1px;
  background: #dfe5ee;
  content: '';
}
</style>

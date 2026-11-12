<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PasswordField from './PasswordField.vue'
import { useMockAuth } from './useMockAuth'
import { demoAccount } from './mocks'
const router = useRouter()
const { login, registeredEmail, registrationNotice, warning } = useMockAuth()
const email = ref('')
const password = ref('')
const remember = ref(false)
const error = ref('')
const busy = ref(false)
onMounted(() => { email.value = registeredEmail.value })
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    error.value = await login(email.value, password.value, remember.value)
    if (!error.value) { password.value = ''; await router.push('/dashboard') }
  } catch { error.value = '데모 로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }
  finally { busy.value = false }
}
</script>
<template>
  <div class="auth-form-heading"><span class="section-kicker">WELCOME BACK</span><h1>다시 오신 것을 환영합니다.</h1><p>AAT에 로그인하고<br />업무를 이어서 진행하세요.</p></div>
  <p v-if="registrationNotice" class="entry-success" role="status">{{ registrationNotice }}</p>
  <p v-if="warning" class="entry-notice" role="status">{{ warning }}</p>
  <form class="entry-form" @submit.prevent="submit">
    <div><label class="entry-field" for="login-email">이메일</label><input id="login-email" v-model="email" type="email" required autocomplete="username" placeholder="name@company.com" /></div>
    <div><PasswordField id="login-password" v-model="password" label="비밀번호" /></div>
    <div class="auth-form-options"><label><input v-model="remember" type="checkbox" />로그인 상태 유지</label><NuxtLink to="/forgot-password">비밀번호 찾기</NuxtLink></div>
    <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
    <button class="entry-button primary full" :disabled="busy" type="submit">{{ busy ? '로그인 중…' : '로그인' }}<UiIcon name="arrow" :size="17" /></button>
  </form>
  <p class="auth-switch">아직 계정이 없으신가요? <NuxtLink to="/register">회원가입</NuxtLink></p>
  <div class="auth-demo"><div><span>DEMO ACCOUNT</span><button type="button" @click="email = demoAccount.email; password = demoAccount.password; error = ''">테스트 계정 입력 <UiIcon name="arrow" :size="13" /></button></div><p>{{ demoAccount.email }}<br /><span>비밀번호</span> {{ demoAccount.password }}</p><small>실제 인증이 아닌 화면 체험용 계정입니다.</small></div>
</template>

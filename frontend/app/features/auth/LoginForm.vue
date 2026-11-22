<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import AuthTabs from './AuthTabs.vue'
import PasswordField from './PasswordField.vue'
import SocialAuthButtons from './SocialAuthButtons.vue'
import { validCode } from './signup'
import { useAuth, type SocialProvider } from './useAuth'
const router = useRouter()
const { login, logout, startSocialAuth, warning } = useAuth()
const office = ref('')
const identifier = ref('')
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
    error.value = await login(identifier.value, password.value, remember.value)
    if (!error.value) { password.value = ''; startOtp() }
  } catch { error.value = '로그인 처리 중 문제가 발생했습니다. 브라우저 저장소와 연결 상태를 확인해 주세요.' }
  finally { busy.value = false }
}

// 2차 인증 (데모: 문자는 보내지 않고, 숫자 6자리 아무거나 통과)
const otpStep = ref(false)
const otp = ref('')
const otpError = ref('')
const otpLeft = ref(180)
let otpTimer: ReturnType<typeof setInterval> | undefined

function startOtp() {
  otpStep.value = true
  otp.value = ''
  otpError.value = ''
  otpLeft.value = 180
  clearInterval(otpTimer)
  otpTimer = setInterval(() => {
    otpLeft.value--
    if (otpLeft.value <= 0) {
      clearInterval(otpTimer)
      otpError.value = '인증 시간이 만료되었습니다. 인증번호를 다시 받아주세요.'
    }
  }, 1000)
}

function otpTime() {
  const left = Math.max(otpLeft.value, 0)
  return String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0')
}

async function confirmOtp() {
  if (otpLeft.value <= 0) return
  if (!validCode(otp.value)) { otpError.value = '인증번호 6자리를 입력하세요.'; return }
  await enter()
}

async function enter() {
  clearInterval(otpTimer)
  await router.push('/dashboard')
}

async function otherAccount() {
  clearInterval(otpTimer)
  otpStep.value = false
  await logout()
}

onBeforeUnmount(() => clearInterval(otpTimer))

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
  <template v-if="otpStep">
    <div data-ui-login-form class="auth-form-heading"><span data-ui-login-form class="section-kicker">2-STEP VERIFICATION</span><h1 data-ui-login-form>2차 인증</h1><p data-ui-login-form>등록된 휴대폰으로 인증번호를 보냈습니다.</p></div>
    <form data-ui-login-form class="entry-form" @submit.prevent="confirmOtp">
      <div data-ui-login-form>
        <label data-ui-login-form class="entry-field" for="login-otp">인증번호</label>
        <input data-ui-login-form id="login-otp" v-model="otp" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="6자리 입력" />
        <small data-ui-login-form class="entry-hint">남은 시간 {{ otpTime() }} · 데모: 숫자 6자리 아무거나 입력</small>
      </div>
      <p data-ui-login-form v-if="otpError" class="entry-error" role="alert">{{ otpError }}</p>
      <button data-ui-login-form class="entry-button primary full" type="submit" :disabled="otpLeft <= 0">인증 완료<UiIcon data-ui-login-form name="arrow" :size="17" /></button>
      <div data-ui-login-form class="auth-form-options">
        <button data-ui-login-form class="su-back" type="button" @click="startOtp">인증번호 재전송</button>
        <button data-ui-login-form class="su-back" type="button" @click="otherAccount">← 다른 계정으로 로그인</button>
      </div>
      <button data-ui-login-form class="su-skip" type="button" @click="enter">데모: 인증 완료로 처리하고 넘어가기</button>
    </form>
  </template>

  <template v-else>
  <AuthTabs data-ui-login-form active="login" />
  <div data-ui-login-form class="auth-form-heading"><span data-ui-login-form class="section-kicker">WELCOME BACK</span><h1 data-ui-login-form>다시 오신 것을 환영합니다.</h1><p data-ui-login-form>AAT에 로그인하고<br data-ui-login-form />업무를 이어서 진행하세요.</p></div>
  <p data-ui-login-form v-if="warning" class="entry-notice" role="status">{{ warning }}</p>
  <form data-ui-login-form class="entry-form" @submit.prevent="submit">
    <div data-ui-login-form><label data-ui-login-form class="entry-field" for="login-office">사무소 코드</label><input data-ui-login-form id="login-office" v-model="office" type="text" maxlength="40" :spellcheck="false" autocomplete="organization" placeholder="소속된 사무소가 없으면 비워 두세요" /></div>
    <div data-ui-login-form><label data-ui-login-form class="entry-field" for="login-identifier">아이디 또는 이메일</label><input data-ui-login-form id="login-identifier" v-model="identifier" type="text" maxlength="254" autocapitalize="none" :spellcheck="false" required autocomplete="username" placeholder="아이디 또는 이메일을 입력하세요" /></div>
    <div data-ui-login-form><PasswordField data-ui-login-form id="login-password" v-model="password" label="비밀번호" /></div>
    <div data-ui-login-form class="auth-form-options"><label data-ui-login-form><input data-ui-login-form v-model="remember" :disabled="busy || socialBusy" type="checkbox" />로그인 상태 유지</label><NuxtLink data-ui-login-form to="/forgot-password">비밀번호 찾기</NuxtLink></div>
    <p data-ui-login-form v-if="error" class="entry-error" role="alert">{{ error }}</p>
    <button data-ui-login-form class="entry-button primary full" :disabled="busy || socialBusy" type="submit">{{ busy ? '로그인 중…' : '로그인' }}<UiIcon data-ui-login-form name="arrow" :size="17" /></button>
  </form>
  <section data-ui-login-form class="social-login" aria-labelledby="social-login-heading">
    <h2 data-ui-login-form id="social-login-heading">SNS 간편 로그인</h2>
    <SocialAuthButtons data-ui-login-form action="로그인" :disabled="busy || socialBusy" @select="submitSocial" />
    <p data-ui-login-form v-if="socialError" class="entry-error" role="alert">{{ socialError }}</p>
  </section>
  <p data-ui-login-form class="auth-switch">아직 계정이 없으신가요? <NuxtLink data-ui-login-form to="/register">회원가입</NuxtLink></p>
  <p data-ui-login-form class="auth-register-note">등록된 관리자 계정으로 로그인해 주세요.</p>
  </template>
</template>

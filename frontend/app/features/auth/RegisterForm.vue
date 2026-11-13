<script setup lang="ts">
import { reactive, ref } from 'vue'
import PasswordField from './PasswordField.vue'
import { useMockAuth } from './useMockAuth'
import type { RegisterInput } from './types'
const { register, warning } = useMockAuth()
const input = reactive<RegisterInput>({ name: '', email: '', password: '', confirmation: '', accepted: false })
const error = ref('')
const busy = ref(false)
const policy = ref(false)
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    error.value = await register(input)
    if (!error.value) { input.password = ''; input.confirmation = ''; warning.value = '화면 체험용 가입입니다. 실제 로그인 계정은 관리자에게 요청해 주세요.' }
  } catch { error.value = '데모 계정을 준비하지 못했습니다. 브라우저 환경을 확인한 후 다시 시도해 주세요.' }
  finally { busy.value = false }
}
</script>
<template>
  <div class="auth-form-heading"><span class="section-kicker">START YOUR WORKSPACE</span><h1>AAT를<br />시작해 보세요.</h1><p>간단한 정보 입력으로<br />세무회계 업무 환경을 준비할 수 있습니다.</p></div>
  <p v-if="warning" class="entry-notice" role="status">{{ warning }}</p>
  <form class="entry-form register-form" @submit.prevent="submit">
    <div><label class="entry-field" for="register-name">이름</label><input id="register-name" v-model="input.name" autocomplete="name" required maxlength="60" placeholder="이름을 입력해 주세요" /></div>
    <div><label class="entry-field" for="register-email">이메일</label><input id="register-email" v-model="input.email" type="email" autocomplete="username" required maxlength="254" placeholder="name@company.com" /></div>
    <div><PasswordField id="register-password" v-model="input.password" label="비밀번호" autocomplete="new-password" /><small class="entry-hint">8자 이상, 영문·숫자·특수문자를 포함해 주세요.</small></div>
    <div><PasswordField id="register-confirmation" v-model="input.confirmation" label="비밀번호 확인" autocomplete="new-password" /><small v-if="input.confirmation" class="entry-hint" :class="input.password === input.confirmation ? 'matched' : 'unmatched'">{{ input.password === input.confirmation ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.' }}</small></div>
    <div class="auth-agreement"><label><input v-model="input.accepted" type="checkbox" /><span>[필수] 이용약관 및 개인정보처리방침 동의 (데모)</span></label><button type="button" @click="policy = true">내용 보기</button></div>
    <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
    <button class="entry-button primary full" :disabled="busy" type="submit">{{ busy ? '데모 계정 준비 중…' : '회원가입' }}<UiIcon name="arrow" :size="17" /></button>
  </form>
  <p class="auth-switch">이미 계정이 있으신가요? <NuxtLink to="/login">로그인</NuxtLink></p>
  <p class="auth-register-note">데모 계정은 이 브라우저에서만 사용할 수 있습니다.<br />실제 개인정보 대신 테스트 정보를 입력해 주세요.</p>
  <UiModal :open="policy" title="약관 및 개인정보 안내 (데모)" @close="policy = false"><p>이 동의 항목은 UI 시연용이며 실제 서비스의 이용약관이나 개인정보처리방침이 아닙니다. 정식 문서는 추후 제공됩니다. 계정 입력은 브라우저의 데모 상태로만 처리하며 서버로 전송하지 않습니다.</p><template #footer><UiButton variant="primary" @click="policy = false">확인</UiButton></template></UiModal>
</template>

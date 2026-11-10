<script setup lang="ts">
import { ref } from 'vue'
import { validEmail } from './validation'
const email = ref('')
const sent = ref(false)
const error = ref('')
function submit() {
  error.value = validEmail(email.value) ? '' : '올바른 이메일 주소를 입력해 주세요.'
  sent.value = !error.value
}
</script>
<template>
  <div class="auth-form-heading"><span class="section-kicker">LET’S GET YOU BACK</span><h1>비밀번호를 잊으셨나요?</h1><p>가입한 이메일 주소를 입력해 주세요.<br />비밀번호 재설정 화면을 체험할 수 있습니다.</p></div>
  <form class="entry-form" @submit.prevent="submit"><div><label class="entry-field" for="reset-email">이메일</label><input id="reset-email" v-model="email" type="email" required autocomplete="email" placeholder="name@company.com" @input="sent = false" /></div><p v-if="error" class="entry-error" role="alert">{{ error }}</p><button type="submit" class="entry-button primary full">재설정 안내 전송 <UiIcon name="arrow" :size="17" /></button></form>
  <p v-if="sent" class="entry-success" role="status">요청을 확인했습니다. 데모 화면입니다. 실제 재설정 이메일은 발송되지 않습니다.</p>
  <p v-else class="auth-register-note">데모 화면입니다. 실제 재설정 이메일은 발송되지 않습니다.</p>
  <NuxtLink class="auth-return" to="/login">← 로그인 화면으로 돌아가기</NuxtLink>
</template>

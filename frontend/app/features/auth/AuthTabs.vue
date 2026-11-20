<script setup lang="ts">
// 로그인 · 회원가입 탭
defineProps<{ active: 'login' | 'register' }>()
</script>

<template>
  <nav class="auth-tabs" aria-label="로그인 · 회원가입">
    <NuxtLink to="/login" :class="{ active: active === 'login' }" :aria-current="active === 'login' ? 'page' : undefined">로그인</NuxtLink>
    <NuxtLink to="/register" :class="{ active: active === 'register' }" :aria-current="active === 'register' ? 'page' : undefined">회원가입</NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import ProductBrand from '~/features/landing/ProductBrand.vue'
import DashboardPreview from '~/features/landing/DashboardPreview.vue'
import '~/features/landing/entry.css'
</script>
<template>
  <div class="entry-shell auth-shell">
    <aside class="auth-story"><ProductBrand /><div class="auth-story-main"><span class="auth-story-eyebrow">LESS COMPLEXITY. MORE CLARITY.</span><h2>복잡한 업무는 간결하게.<br /> 중요한 일에 더 집중하세요.</h2><p>거래처와 전표, 오늘의 업무 현황까지.<br />세무회계 전문가를 위한 하나의 업무 공간.</p><div class="auth-preview-wrap"><DashboardPreview compact /></div><div class="auth-story-note"><span><UiIcon name="check" :size="15" />한눈에 보는 업무 현황</span><span><UiIcon name="check" :size="15" />단계별 시작 가이드</span></div></div><p class="auth-story-bottom">Accounting Pro · 세무회계 업무를 위한 워크스페이스</p></aside>
    <main class="auth-main"><NuxtLink to="/" class="auth-back">← 서비스 홈으로</NuxtLink><div class="auth-form-wrap"><slot /></div><p class="auth-bottom-note">UI 데모 · 실제 인증 및 회원정보 서버 저장은 진행하지 않습니다.</p></main>
  </div>
</template>

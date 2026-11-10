<script setup lang="ts">
import DashboardPreview from './DashboardPreview.vue'
</script>
<template>
  <section id="about" class="landing-hero">
    <div class="hero-grid" aria-hidden="true" />
    <div class="hero-copy"><span class="entry-eyebrow"><i />세무회계 업무를 위한 새로운 워크스페이스</span>
      <h1>복잡한 세무회계 업무,<br /><span>하나의 공간에서</span> 더 간편하게</h1>
      <p>거래처 관리부터 회계 처리, 세금 신고와 업무 현황까지.<br class="desktop-break" />Accounting Pro에서 세무회계 업무를 체계적으로 관리하세요.</p>
      <div class="hero-actions"><NuxtLink to="/register" class="entry-button primary">무료로 시작하기 <UiIcon name="arrow" :size="17" /></NuxtLink><a href="#product-preview" class="entry-button secondary">서비스 살펴보기 <UiIcon name="chevron" :size="15" /></a></div>
      <small class="hero-disclaimer">가입부터 환경설정까지, UI 데모로 미리 경험해 보세요.</small>
    </div>
    <div id="product-preview" class="hero-product"><div class="preview-browser-bar"><span><i /><i /><i /></span><small>Accounting Pro · 나의 업무 공간</small><span class="preview-demo-label">가상 데이터</span></div><DashboardPreview /></div>
    <p class="preview-caption">제품 화면 미리보기 · 실제 업무 데이터가 아닌 데모 콘텐츠입니다.</p>
  </section>
</template>

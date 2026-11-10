<script setup lang="ts">
import { ref } from 'vue'
import ProductBrand from './ProductBrand.vue'
const menuOpen = ref(false)
</script>
<template>
  <header class="landing-header">
    <div class="landing-header-inner">
      <ProductBrand />
      <nav class="landing-nav" :class="{ expanded: menuOpen }" aria-label="서비스 메뉴">
        <a href="#features" @click="menuOpen = false">주요 기능</a>
        <a href="#about" @click="menuOpen = false">서비스 소개</a>
        <a href="#workflow" @click="menuOpen = false">이용 안내</a>
      </nav>
      <div class="landing-header-actions"><NuxtLink to="/login" class="entry-link">로그인</NuxtLink><NuxtLink to="/register" class="entry-button primary">무료로 시작하기 <UiIcon name="arrow" :size="15" /></NuxtLink><button class="landing-menu-toggle" aria-label="서비스 메뉴 열기" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><UiIcon :name="menuOpen ? 'close' : 'menu'" /></button></div>
    </div>
  </header>
</template>

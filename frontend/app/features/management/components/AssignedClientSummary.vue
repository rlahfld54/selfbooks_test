<script setup lang="ts">
import { useClientAssignments } from '../useClientAssignments'

const { summary } = useClientAssignments()
</script>

<template>
  <section
    class="panel assignment-summary"
    aria-label="내 담당 업체 요약"
  >
    <div>
      <h3>내 담당 업체</h3><p class="sub">
        전체 {{ summary.total }}개 · 주담당 {{ summary.primary }}개 · 보조담당 {{ summary.secondary }}개 · 확인 필요 {{ summary.review }}개
      </p>
    </div>
    <NuxtLink
      class="btn"
      to="/client-directory?tab=mine"
    >내 담당 업체 보기 →</NuxtLink>
  </section>
</template>

<style scoped>
.assignment-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 20px; margin-bottom: 20px; }
</style>

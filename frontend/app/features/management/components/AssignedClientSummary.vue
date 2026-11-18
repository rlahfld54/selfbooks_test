<script setup lang="ts">
import { useClientAssignments } from '../useClientAssignments'

const { summary, loading, error, mine } = useClientAssignments()
</script>

<template>
  <section
    class="panel assignment-summary"
    aria-label="내 담당 업체 요약"
  >
    <div>
      <h3>내 담당 업체</h3><p v-if="loading" role="status">업체 정보를 불러오는 중입니다.</p><p v-else-if="error" role="alert">{{ error }}</p><p v-else class="sub">
        전체 {{ summary.total }}개 · 주담당 {{ summary.primary }}개 · 보조담당 {{ summary.secondary }}개 · 확인 필요 {{ mine.some(client => client.company || client.environment) ? summary.review + '개' : '정보 없음' }}
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

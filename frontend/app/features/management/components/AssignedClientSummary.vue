<script setup lang="ts">
import { useClientAssignments } from '../useClientAssignments'

const { summary, loading, error, mine } = useClientAssignments()
</script>

<template>
  <section data-ui-assigned-client-summary class="panel assignment-summary" aria-label="내 담당 업체 요약">
    <div data-ui-assigned-client-summary>
      <h3 data-ui-assigned-client-summary>내 담당 업체</h3>
      <p data-ui-assigned-client-summary v-if="loading" role="status">업체 정보를 불러오는 중입니다.</p>
      <p data-ui-assigned-client-summary v-else-if="error" role="alert">{{ error }}</p>
      <p data-ui-assigned-client-summary v-else class="sub">
        전체 {{ summary.total }}개 · 주담당 {{ summary.primary }}개 · 보조담당
        {{ summary.secondary }}개 · 확인 필요
        {{
          mine.some((client) => client.company || client.environment)
            ? summary.review + '개'
            : '정보 없음'
        }}
      </p>
    </div>
    <NuxtLink data-ui-assigned-client-summary class="btn" to="/client-directory?tab=mine">내 담당 업체 보기 →</NuxtLink>
  </section>
</template>

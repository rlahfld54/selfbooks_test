<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: '표시할 데이터가 없습니다.',
  description: '검색 조건을 변경해 보세요.',
})
</script>
<template>
  <div class="feedback-state">
    <UiIcon name="search" :size="28" /><strong>{{ title }}</strong
    ><span>{{ description }}</span
    ><slot />
  </div>
</template>

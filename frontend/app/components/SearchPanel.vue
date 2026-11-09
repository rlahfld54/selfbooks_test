<script setup lang="ts">
import type { DemoRow } from '~/data/demo'
const props = defineProps<{ items: DemoRow[] }>()
defineEmits<{ select: [row: DemoRow] }>()
const { query, results } = useSearch(() => props.items)
</script>
<template>
  <div class="search-panel">
    <UiInput
      v-model="query"
      aria-label="관련 거래처 검색"
      placeholder="관련 거래처 검색"
    /><UiButton v-for="row in results" :key="row.id" variant="ghost" @click="$emit('select', row)"
      >{{ row.name }} <UiIcon name="chevron" :size="14" /></UiButton
    ><EmptyState v-if="!results.length" />
  </div>
</template>

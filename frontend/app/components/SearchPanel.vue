<script setup lang="ts" generic="T extends SearchItem">
import type { SearchItem } from '~/types/search'
const props = withDefaults(defineProps<{ items: T[]; label?: string; placeholder?: string; resettable?: boolean }>(), {
  label: '관련 거래처 검색', placeholder: '관련 거래처 검색',
})
defineEmits<{ select: [row: T] }>()
const query = defineModel<string>('query', { default: '' })
const { results } = useSearch(() => props.items, query)
</script>
<template>
  <div class="search-panel">
    <UiInput
      v-model="query"
      :aria-label="label"
      :placeholder="placeholder"
    /><UiButton v-if="resettable" :disabled="!query" @click="query = ''">초기화</UiButton>
    <UiButton v-for="row in results" :key="row.id" variant="ghost" @click="$emit('select', row)"
      >{{ row.name }} <UiIcon name="chevron" :size="14" /></UiButton
    ><EmptyState v-if="!results.length" />
  </div>
</template>

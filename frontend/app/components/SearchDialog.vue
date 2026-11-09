<script setup lang="ts">
import type { DemoRow } from '~/data/demo'
const props = defineProps<{ open: boolean; items: DemoRow[] }>()
const emit = defineEmits<{ close: []; select: [item: DemoRow] }>()
const { query, index, results, move } = useSearch(() => props.items)
const listId = useId()
watch(() => props.open, value => { if (value) { query.value = ''; index.value = 0 } })
function select() { const row = results.value[index.value]; if (row) emit('select', row) }
function navigate(delta: number) { move(delta); nextTick(() => document.getElementById(listId + '-' + index.value)?.scrollIntoView({ block: 'nearest' })) }
</script>
<template><UiModal :open="open" title="거래처 검색" size="search" @close="emit('close')"><p class="muted">샘플 거래처 · ↑ ↓ 이동 / Enter 선택 / Esc 닫기</p><UiInput v-model="query" data-autofocus aria-label="거래처명 또는 코드 검색" placeholder="거래처명 또는 코드를 입력하세요" role="combobox" aria-autocomplete="list" :aria-expanded="true" :aria-controls="listId" :aria-activedescendant="results.length ? listId + '-' + index : undefined" @keydown.down.prevent="navigate(1)" @keydown.up.prevent="navigate(-1)" @keydown.enter.prevent="select" /><div :id="listId" role="listbox" aria-label="거래처 검색 결과" class="search-results"><div v-for="(row, i) in results" :id="listId + '-' + i" :key="row.id" role="option" :aria-selected="index === i" class="search-result" :class="{ active: index === i }" @click="emit('select', row)"><span class="muted">{{ row.code }}</span><strong>{{ row.name }}</strong><span>{{ row.contact }}</span></div></div><EmptyState v-if="!results.length" /><template #footer><span class="muted">{{ results.length }}개 결과</span><UiButton @click="emit('close')">취소</UiButton><UiButton variant="primary" :disabled="!results.length" @click="select">선택</UiButton></template></UiModal></template>


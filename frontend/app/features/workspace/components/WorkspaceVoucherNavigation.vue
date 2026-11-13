<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'

const { state, navigate } = useWorkspaceContext()
const entries = [
  { id: 'voucher', label: '일반전표' },
  { id: 'sales-journal', label: '매입매출전표' },
] as const
</script>

<template>
  <nav class="section-switcher" aria-label="전표 입력 전환">
    <UiButton
      v-for="entry in entries"
      :key="entry.id"
      :variant="state.active === entry.id ? 'primary' : undefined"
      :aria-current="state.active === entry.id ? 'page' : undefined"
      @click="navigate(entry.id, 'tab')"
    >{{ entry.label }}</UiButton>
  </nav>
</template>

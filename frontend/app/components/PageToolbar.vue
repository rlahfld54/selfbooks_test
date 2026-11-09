<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
<template>
  <header class="page-toolbar">
    <div>
      <div class="eyebrow"><slot name="eyebrow" /></div>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="toolbar-actions"><slot /></div>
  </header>
</template>

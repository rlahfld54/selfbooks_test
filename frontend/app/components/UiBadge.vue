<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }>(), {
  tone: 'primary',
})
</script>
<template>
  <span class="badge" :class="tone"><slot /></span>
</template>

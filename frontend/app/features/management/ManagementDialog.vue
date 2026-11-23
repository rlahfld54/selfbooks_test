<script setup lang="ts">
defineProps<{ label: string; drawer?: boolean; busy?: boolean; dirty?: boolean }>()
defineEmits<{ close: [] }>()
</script>
<template>
  <UiModal :open="true" :title="label" appearance="management" :placement="drawer ? 'right' : 'center'" close-on-backdrop :busy="busy" :dirty="dirty" @close="$emit('close')">
    <template #header><slot name="heading"><h2>{{ label }}</h2></slot></template>
    <slot />
    <template v-if="$slots.footer" #footer="{ close }"><slot name="footer" :close="close" /></template>
  </UiModal>
</template>

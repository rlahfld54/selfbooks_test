<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template><UiInput type="date" :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" /></template>


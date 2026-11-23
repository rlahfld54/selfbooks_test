<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: '' })
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <UiInput v-bind="$attrs" mode="amount" :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" />
</template>

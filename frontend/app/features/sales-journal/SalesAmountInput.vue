<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <UiInput v-bind="$attrs" mode="amount" input-policy="preserve" :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" />
</template>

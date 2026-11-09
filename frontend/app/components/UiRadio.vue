<script setup lang="ts">
defineProps<{ modelValue: string; value: string; name: string; label: string; disabled?: boolean }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template><label class="choice"><input type="radio" :name="name" :value="value" :checked="modelValue === value" :disabled="disabled" @change="$emit('update:modelValue', value)" />{{ label }}</label></template>


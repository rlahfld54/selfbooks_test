<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: '' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
function update(event: Event) {
 const input = event.target as HTMLInputElement
 input.value = input.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '')
 emit('update:modelValue', input.value)
}
</script>
<template><input v-bind="$attrs" class="input numeric" inputmode="numeric" :value="modelValue" @input="update" /></template>


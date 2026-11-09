<script setup lang="ts">
const props = defineProps<{ modelValue: string; options: { value: string; label: string }[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
async function change(event: Event) {
 const element = event.target as HTMLSelectElement
 emit('update:modelValue', element.value)
 await nextTick()
 element.value = props.modelValue
}
</script>
<template><select class="input" :value="modelValue" @change="change"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select></template>


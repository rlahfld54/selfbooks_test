<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ modelValue?: string; type?: string; invalid?: boolean }>(), {
  modelValue: '',
  type: 'text',
})
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <input
    v-bind="$attrs"
    class="input"
    :type="type"
    :value="modelValue"
    :aria-invalid="invalid || undefined"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

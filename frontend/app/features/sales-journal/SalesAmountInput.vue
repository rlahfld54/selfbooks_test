<script setup lang="ts">
import { formatAmount } from '~/utils/formatAmount'
defineOptions({ inheritAttrs: false })
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const focused = ref(false)
</script>
<template>
  <input
    v-bind="$attrs"
    class="input numeric"
    inputmode="numeric"
    :value="focused ? modelValue : formatAmount(modelValue)"
    @focus="focused = true"
    @blur="focused = false"
    @input="
      emit('update:modelValue', ($event.target as HTMLInputElement).value.replaceAll(',', ''))
    "
  />
</template>

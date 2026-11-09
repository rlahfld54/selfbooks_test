<script setup lang="ts">
import { formatAmount } from "~/utils/workspace";
defineOptions({ inheritAttrs: false });
withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: "" });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const focused = ref(false);
function update(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "");
  input.value = value;
  emit("update:modelValue", value);
}
</script>
<template>
  <input
    v-bind="$attrs"
    class="input numeric"
    inputmode="numeric"
    :value="focused ? modelValue : formatAmount(modelValue)"
    @input="update"
    @focus="focused = true"
    @blur="focused = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ modelValue: string; label: string; id: string; autocomplete?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
const visible = ref(false)
</script>

<template>
  <label class="entry-field" :for="id">{{ label }}</label>
  <div class="entry-password">
    <input :id="id" :value="modelValue" :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete || 'current-password'" required maxlength="128"
      placeholder="비밀번호를 입력해 주세요"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <button type="button" :aria-label="`${label} ${visible ? '숨기기' : '표시'}`" :aria-pressed="visible" @click="visible = !visible">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /><path v-if="visible" d="m3 3 18 18" />
      </svg>
    </button>
  </div>
</template>

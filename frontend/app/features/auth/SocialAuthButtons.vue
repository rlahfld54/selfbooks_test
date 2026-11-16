<script setup lang="ts">
import type { SocialProvider } from './useAuth'

defineProps<{ action: '로그인' | '연결'; disabled: boolean }>()
const emit = defineEmits<{ select: [provider: SocialProvider] }>()

const providers = [
  { id: 'kakao', name: '카카오', style: 'kakao' },
  { id: 'custom:naver', name: '네이버', style: 'naver' },
  { id: 'google', name: 'Google', style: 'google' },
] as const
</script>

<template>
  <div class="social-auth-buttons">
    <button
      v-for="provider in providers"
      :key="provider.id"
      :class="provider.style"
      :aria-label="`${provider.name} ${action}`"
      :disabled="disabled"
      type="button"
      @click="emit('select', provider.id)"
    >
      {{ provider.name }}
    </button>
  </div>
</template>

<style scoped>
.social-auth-buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

button {
  min-height: 44px;
  padding: 7px 4px;
  border: 1px solid transparent;
  border-radius: 7px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

button:hover:not(:disabled) { filter: brightness(.95); }
button:focus-visible { outline: 2px solid #4773bb; outline-offset: 2px; }
button:disabled { cursor: wait; opacity: .6; }
.kakao { background: #fee500; color: #251d00; }
.naver { background: #03c75a; color: #092816; }
.google { background: #fff; color: #243b5b; border-color: #dfe5ee; }
</style>

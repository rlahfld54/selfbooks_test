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
  <div data-ui-social-auth-buttons class="social-auth-buttons">
    <button data-ui-social-auth-buttons
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

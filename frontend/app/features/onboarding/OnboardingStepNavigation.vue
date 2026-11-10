<script setup lang="ts">
import { steps } from './mocks'
defineProps<{ step: number }>()
defineEmits<{ go: [step: number] }>()
</script>
<template><nav class="ob-nav" aria-label="환경설정 단계"><button v-for="(item, i) in steps" :key="item.title" :class="{ active: step === i + 1 }" :aria-current="step === i + 1 ? 'step' : undefined" @click="$emit('go', i + 1)"><span class="ob-step-number">{{ i + 1 }}</span><span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span></button><div class="ob-nav-note"><UiIcon name="help" :size="18" /><p>차근차근 준비하세요.<br />설정은 언제든 변경할 수 있어요.</p></div></nav></template>

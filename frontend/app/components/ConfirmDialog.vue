<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean; title?: string; message?: string; confirmLabel?: string
  cancelLabel?: string; tone?: 'primary' | 'danger'; busy?: boolean
}>(), {
  title: '변경 사항을 버릴까요?', message: '저장하지 않은 샘플 입력 내용이 사라집니다.',
  confirmLabel: '변경 사항 버리기', cancelLabel: '취소', tone: 'danger',
})
defineEmits<{ confirm: []; cancel: [] }>()
</script>
<template>
  <UiModal :open="open" :title="title" size="confirm" :busy="busy" @close="$emit('cancel')">
    <p>{{ message }}</p>
    <template #footer>
      <slot name="footer">
        <UiButton data-autofocus :disabled="busy" @click="$emit('cancel')">{{ cancelLabel }}</UiButton>
        <UiButton :variant="tone" :disabled="busy" @click="$emit('confirm')">{{ busy ? '처리 중…' : confirmLabel }}</UiButton>
      </slot>
    </template>
  </UiModal>
</template>

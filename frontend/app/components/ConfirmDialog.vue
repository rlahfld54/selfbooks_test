<script setup lang="ts">
withDefaults(
  defineProps<{ open: boolean; title?: string; message?: string; confirmLabel?: string }>(),
  {
    title: '변경 사항을 버릴까요?',
    message: '저장하지 않은 샘플 입력 내용이 사라집니다.',
    confirmLabel: '변경 사항 버리기',
  },
)
defineEmits<{ confirm: []; cancel: [] }>()
</script>
<template>
  <UiModal :open="open" :title="title" size="confirm" @close="$emit('cancel')"
    ><p>{{ message }}</p>
    <template #footer
      ><UiButton data-autofocus @click="$emit('cancel')">취소</UiButton
      ><UiButton variant="danger" @click="$emit('confirm')">{{ confirmLabel }}</UiButton></template
    ></UiModal
  >
</template>

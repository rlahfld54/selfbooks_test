<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
const { pending, answer } = useWorkspaceContext()
const messages = {
  company: { title: '회사를 전환할까요?', message: '현재 회사의 업무 탭을 정리합니다. 미저장 입력은 사라집니다.', label: '회사 전환' },
  close: { title: '이 탭을 닫을까요?', message: '이 탭의 미저장 입력이 사라집니다. 계속하시겠습니까?', label: '변경 사항 버리기' },
  navigate: { title: '다른 페이지로 이동할까요?', message: '이 탭을 닫기 전까지 미저장 입력은 이번 세션에 유지됩니다.', label: '페이지 이동' },
} as const
const dialog = computed(() => pending.value && messages[pending.value.kind])
</script>

<template>
  <ConfirmDialog
    :open="!!dialog"
    :title="dialog?.title"
    :message="dialog?.message"
    :confirm-label="dialog?.label"
    @cancel="answer(false)"
    @confirm="answer(true)"
  />
</template>

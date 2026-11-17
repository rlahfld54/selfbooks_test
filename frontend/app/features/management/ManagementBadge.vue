<script setup lang="ts">
const props = defineProps<{ value: string }>()
const colors: Record<string, string> = {
  '수임 중': 'green',
  활성: 'green',
  '검토 완료': 'green',
  '조직 관리자': 'blue',
  '검토 중': 'orange',
  '등록 대기': 'orange',
  '초대 대기': 'orange',
  '수임 종료': 'red',
}
</script>

<template>
  <span class="badge" :class="colors[props.value]">{{ props.value || '—' }}</span>
</template>

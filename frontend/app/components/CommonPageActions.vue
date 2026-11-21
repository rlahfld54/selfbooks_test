<script setup lang="ts">
const dark = useState('workspace-dark', () => false)
const notice = ref('')
useHead(() => ({ htmlAttrs: { 'data-theme': dark.value ? 'dark' : 'light' } }))
function printPage() {
  window.print()
}
</script>
<template>
  <div>
    <div class="common-actions" role="group" aria-label="공통 액션">
      <UiButton :aria-pressed="dark" @click="dark = !dark">
        {{ dark ? '☾ 다크' : '☀ 라이트' }}
      </UiButton>
      <UiButton @click="printPage">인쇄</UiButton>
      <slot name="delete">
        <UiButton @click="notice = '삭제 기능은 화면별 삭제 정책에 연결 예정입니다.'">
          삭제
        </UiButton>
      </slot>
    </div>
    <p v-if="notice" role="status">{{ notice }}</p>
  </div>
</template>

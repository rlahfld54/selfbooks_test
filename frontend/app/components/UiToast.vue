<script setup lang="ts">
defineProps<{ message: string }>()
defineEmits<{ close: [] }>()
</script>
<template><div v-if="message" class="toast" role="status"><UiIcon name="check" /><span>{{ message }}</span><UiButton variant="ghost" aria-label="알림 닫기" @click="$emit('close')"><UiIcon name="close" :size="16" /></UiButton></div></template>


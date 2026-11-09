<script setup lang="ts">withDefaults(defineProps<{ message?: string }>(), { message: '데이터를 불러오지 못했습니다.' }); defineEmits<{ retry: [] }>()</script>
<template><div class="feedback-state" role="alert"><strong>{{ message }}</strong><UiButton @click="$emit('retry')">다시 시도</UiButton></div></template>

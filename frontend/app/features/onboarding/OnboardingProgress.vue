<script setup lang="ts">defineProps<{ step: number }>()</script>
<template><div class="ob-progress" role="progressbar" :aria-valuenow="step" :aria-valuemin="1" :aria-valuemax="5" aria-label="환경설정 진행 단계"><div><span>초기 환경설정</span><strong>{{ step }} / 5 단계</strong></div><div class="ob-progress-bars"><span v-for="n in 5" :key="n" :class="{ filled: n <= step }" /></div></div></template>

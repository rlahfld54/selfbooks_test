<script setup lang="ts">defineProps<{ title?: string }>()</script>
<template><section class="card"><header v-if="title || $slots.actions" class="card-heading"><h2>{{ title }}</h2><slot name="actions" /></header><slot /></section></template>


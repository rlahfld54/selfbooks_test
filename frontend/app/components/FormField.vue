<script setup lang="ts">defineProps<{ label: string; id: string; error?: string; hint?: string }>()</script>
<template><div class="form-field"><label :for="id">{{ label }}</label><slot :id="id" :describedby="error || hint ? id + '-message' : undefined" /><small v-if="error || hint" :id="id + '-message'" :class="{ 'field-error': error }" :role="error ? 'alert' : undefined">{{ error || hint }}</small></div></template>


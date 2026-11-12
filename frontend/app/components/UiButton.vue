<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'; size?: 'small' | 'normal' | 'medium' | 'large'; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit' | 'reset' }>(), { variant: 'secondary', size: 'normal', type: 'button' })
</script>
<template><button :type="type" class="button" :class="[variant, { large: size === 'large', small: size === 'small' }]" :disabled="disabled || loading" :aria-busy="loading || undefined"><span v-if="loading" class="spinner" aria-hidden="true" /><slot /></button></template>


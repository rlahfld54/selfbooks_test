<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'normal' | 'large'; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }>(), { variant: 'secondary', size: 'normal', type: 'button' })
</script>
<template><button :type="type" class="button" :class="[variant, { large: size === 'large' }]" :disabled="disabled"><slot /></button></template>


<script setup lang="ts">
import symbolLogo from '~/assets/aat-symbol.svg'
withDefaults(defineProps<{ compact?: boolean; inverse?: boolean }>(), { compact: false, inverse: false })
</script>
<template>
  <span class="aat-brand" :class="{ 'aat-brand-inverse': inverse, 'aat-brand-compact': compact }">
    <img :src="symbolLogo" alt="" class="aat-logo-symbol" />
    <span :class="compact ? 'sr-only' : 'aat-brand-wordmark'">Accounting Pro</span>
  </span>
</template>

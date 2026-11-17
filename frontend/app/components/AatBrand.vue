<script setup lang="ts">
import horizontalLogo from '~/assets/aat-logo-horizontal.svg'
import symbolLogo from '~/assets/aat-symbol.svg'
defineProps<{ compact?: boolean }>()
</script>
<template>
  <span class="aat-brand">
    <img v-if="compact" :src="symbolLogo" alt="AAT" class="aat-logo-symbol" />
    <img v-else :src="horizontalLogo" alt="AAT · AI Accounting Tax" class="aat-logo-horizontal" />
  </span>
</template>

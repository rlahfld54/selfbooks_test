<script setup lang="ts">
import horizontalLogo from '~/assets/aat-logo-horizontal.svg'
import symbolLogo from '~/assets/aat-symbol.svg'
withDefaults(defineProps<{ compact?: boolean; inverse?: boolean }>(), { compact: false, inverse: false })
</script>
<template>
  <span class="aat-brand" :class="{ 'aat-brand-inverse': inverse, 'aat-brand-compact': compact }">
    <img v-if="!inverse && !compact" :src="horizontalLogo" alt="AAT · AI Accounting Tax" class="aat-logo-horizontal" />
    <template v-else><img :src="symbolLogo" alt="" class="aat-logo-symbol" /><span v-if="!compact" class="aat-brand-wordmark">AAT<span class="aat-brand-caption">AI Accounting Tax</span></span><span v-else class="sr-only">AAT</span></template>
  </span>
</template>

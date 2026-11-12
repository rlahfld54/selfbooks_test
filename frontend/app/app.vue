<script setup lang="ts">
import favicon from '~/assets/aat-symbol.svg'
useHead({ link: [{ rel: 'icon', type: 'image/svg+xml', href: favicon }] })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

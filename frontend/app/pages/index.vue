<script setup lang="ts">
import LandingHeader from '~/features/landing/LandingHeader.vue'
import HeroSection from '~/features/landing/HeroSection.vue'
import FeatureSection from '~/features/landing/FeatureSection.vue'
import WorkflowSection from '~/features/landing/WorkflowSection.vue'
import LandingFooter from '~/features/landing/LandingFooter.vue'
definePageMeta({ layout: 'public' })
useHead({ title: 'Accounting Pro · 세무회계 업무의 새로운 시작' })
</script>
<template>
  <LandingHeader />
  <main><HeroSection /><FeatureSection /><WorkflowSection /></main>
  <LandingFooter />
</template>

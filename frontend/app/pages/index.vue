<script setup lang="ts">
const workspaceStore = useWorkspaceStore()

function changeClient() {
  workspaceStore.selectClient(1, '네네치킨')
}

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
  <main>
    <div>
      <p
        style="
          background-color: #007bff;
          color: white;
          padding: 10px 20px;
          margin: 10px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        "
      >
        선택 업체: {{ workspaceStore.selectedClientName }}
      </p>

      <UButton
        style="
          background-color: #007bff;
          color: white;
          padding: 10px 20px;
          margin: 10px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        "
        @click="changeClient"
      >
        업체 선택
      </UButton>
    </div>
    <HeroSection /><FeatureSection /><WorkflowSection />
  </main>
  <LandingFooter />
</template>

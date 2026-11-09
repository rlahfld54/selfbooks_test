<script setup lang="ts">
import DemoPartnerDetails from '~/features/demo-partners/components/DemoPartnerDetails.vue'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
const { activeTab } = useWorkspaceContext()
</script>

<template>
  <DetailPanel
    :open="activeTab.panel"
    :width="activeTab.panelWidth"
    title="거래처 상세"
    @close="activeTab.panel = false"
    @update:width="activeTab.panelWidth = $event"
  >
    <DemoPartnerDetails />
  </DetailPanel>
</template>

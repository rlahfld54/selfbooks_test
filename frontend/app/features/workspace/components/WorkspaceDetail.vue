<script setup lang="ts">
import DemoPartnerDetails from '~/features/demo-partners/components/DemoPartnerDetails.vue'
import VoucherInsight from '~/features/vouchers/VoucherInsight.vue'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
const { activeTab } = useWorkspaceContext()
const title = computed(() => {
  if (['voucher', 'sales'].includes(activeTab.value.id)) return '전표 인사이트'
  return '거래처 상세'
})
</script>

<template>
  <DetailPanel
    :open="activeTab.panel" :min-width="['voucher', 'sales'].includes(activeTab.id) ? 300 : 320" :preserve-focus="['voucher', 'sales'].includes(activeTab.id)"
    :width="activeTab.panelWidth"
    :title="title"
    @close="activeTab.panel = false"
    @update:width="activeTab.panelWidth = $event"
  >
    <VoucherInsight v-if="['voucher', 'sales'].includes(activeTab.id)" />
    <DemoPartnerDetails v-else />
  </DetailPanel>
</template>


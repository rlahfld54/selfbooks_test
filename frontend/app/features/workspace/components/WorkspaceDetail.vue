<script setup lang="ts">
import DemoPartnerDetails from '~/features/demo-partners/components/DemoPartnerDetails.vue'
import VoucherInsight from '~/features/vouchers/VoucherInsight.vue'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
const { activeTab } = useWorkspaceContext()
</script>

<template>
  <DetailPanel
    :open="activeTab.panel" :min-width="['voucher', 'sales'].includes(activeTab.id) ? 300 : 320" :preserve-focus="['voucher', 'sales'].includes(activeTab.id)"
    :width="activeTab.panelWidth"
    :title="['voucher', 'sales'].includes(activeTab.id) ? '전표 인사이트' : '거래처 상세'"
    @close="activeTab.panel = false"
    @update:width="activeTab.panelWidth = $event"
  >
    <VoucherInsight v-if="['voucher', 'sales'].includes(activeTab.id)" />
    <DemoPartnerDetails v-else />
  </DetailPanel>
</template>

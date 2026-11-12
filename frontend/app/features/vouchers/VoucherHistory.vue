<script setup lang="ts">
import { historyRows, accounts, clients } from './mockData'
import { money, type VoucherRow } from './model'
const props = defineProps<{ row: VoucherRow }>()
const chosen = ref<VoucherRow>()
const related = computed(() => historyRows.filter(item => item.client === props.row.client || (!!props.row.account && item.account === props.row.account)))
watch(() => props.row.id, () => { chosen.value = undefined })
</script>
<template><p class="muted">지난 거래 · 읽기 전용</p><button v-for="item in related" :key="item.id" class="voucher-history-row" @click="chosen = item"><span>{{ item.date }} · {{ item.number }}</span><strong>{{ clients.find(c => c.code === item.client)?.name }} · {{ money(item.debit) }} 원</strong><span>{{ accounts.find(a => a.code === item.account)?.name }} / {{ item.memo }}</span></button><p v-if="!related.length">관련 과거 거래가 없습니다.</p><div v-if="chosen" class="voucher-evidence"><h3>{{ chosen.number }} 상세</h3><p>{{ chosen.date }} · {{ chosen.memo }}</p><p>차변 {{ money(chosen.debit) }} 원</p><p>과거 거래 조회는 현재 입력값에 반영되지 않습니다.</p></div></template>

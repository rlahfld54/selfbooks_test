<script setup lang="ts">
import { money, total, type VoucherRow } from './model'
import { clients } from './mockData'
defineProps<{ row: VoucherRow }>()
</script>
<template><div v-if="row.attachment" class="voucher-evidence"><span class="eyebrow">SAMPLE DOCUMENT</span><h3>{{ row.evidence }}</h3><p>테스트용 증빙 · 법적 효력 없음</p><hr><dl><dt>작성일</dt><dd>{{ row.date }}</dd><dt>거래처</dt><dd>{{ clients.find(c => c.code === row.client)?.name }}</dd><dt>공급가액</dt><dd>{{ money(row.supply) }} 원</dd><dt>부가세</dt><dd>{{ money(row.vat) }} 원</dd><dt>합계</dt><dd>{{ money(total(row)) }} 원</dd></dl><p>{{ row.memo }}</p></div><div v-else class="voucher-empty"><h3>연결된 증빙이 없습니다</h3><p>증빙 업로드와 연결은 API 연동 단계에서 제공할 예정입니다.</p></div></template>

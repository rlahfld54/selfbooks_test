<script setup lang="ts">
import { accounts, clients, salesJournalExamples } from './mockData'
import { money, sum, type VoucherRow, type Mode } from './model'
const props = defineProps<{ rows: VoucherRow[]; mode: Mode }>()
const examples = computed(() => salesJournalExamples.filter(item => props.rows.some(row => item.id.startsWith(row.id + '-'))))
</script>
<template>
  <div class="voucher-detail">
    <p v-if="!rows.length" class="muted">전표를 선택하면 같은 일자·전표번호의 분개가 표시됩니다.</p>
    <template v-else-if="mode === 'general'">
      <table class="voucher-grid"><thead><tr><th>계정과목</th><th>거래처</th><th>적요</th><th class="numeric">차변</th><th class="numeric">대변</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{ accounts.find(a => a.code === row.account)?.name || '미선택' }}</td><td>{{ clients.find(c => c.code === row.client)?.name || '미선택' }}</td><td>{{ row.memo }}</td><td class="numeric">{{ money(row.debit) }}</td><td class="numeric">{{ money(row.credit) }}</td></tr></tbody></table>
      <div class="voucher-summary"><strong :class="sum(rows, 'debit') === sum(rows, 'credit') ? 'good' : 'bad'">{{ sum(rows, 'debit') === sum(rows, 'credit') ? '차대 일치' : '차대 불일치' }}</strong><span>차변 {{ sum(rows, 'debit').toLocaleString() }} 원</span><span>대변 {{ sum(rows, 'credit').toLocaleString() }} 원</span></div>
    </template>
    <template v-else><p class="muted">초기 Mock 분개 예시 · 금액 편집 시 자동 변경되지 않습니다. 실제 자동분개·세액 계산은 미연결입니다.</p><table v-if="examples.length" class="voucher-grid"><thead><tr><th>계정과목</th><th>거래처</th><th>적요</th><th class="numeric">차변</th><th class="numeric">대변</th></tr></thead><tbody><tr v-for="line in examples" :key="line.id"><td>{{ accounts.find(a => a.code === line.account)?.name }}</td><td>{{ clients.find(c => c.code === line.client)?.name }}</td><td>{{ line.memo }}</td><td class="numeric">{{ money(line.debit) }}</td><td class="numeric">{{ money(line.credit) }}</td></tr></tbody></table><p v-else>새 전표의 분개 예시는 없습니다.</p><div v-if="examples.length" class="voucher-summary"><strong class="good">예시 차대 일치</strong><span>차변 {{ sum(examples, 'debit').toLocaleString() }} 원</span><span>대변 {{ sum(examples, 'credit').toLocaleString() }} 원</span></div></template>
  </div>
</template>

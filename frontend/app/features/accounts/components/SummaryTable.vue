<script setup lang="ts">
import type { MockSummary, MockAccount } from '../types'
import { sideLabel } from '../types'
defineProps<{ rows: MockSummary[]; accounts: MockAccount[] }>()
defineEmits<{ edit: [summary: MockSummary]; delete: [summary: MockSummary] }>()
</script>
<template>
  <div class="am-scroll">
    <table class="am-table">
      <thead><tr><th>적요코드</th><th>적요명</th><th>계정코드</th><th>계정과목명</th><th>차변/대변</th><th>거래요소 코드</th><th>적요 유형</th><th>사용여부</th><th>관리</th></tr></thead>
      <tbody><tr v-for="s in rows" :key="s.id" @click="$emit('edit', s)">
        <td class="am-code">{{ s.code || '—' }}</td><td><button class="am-row-link" @click.stop="$emit('edit', s)">{{ s.name }}</button></td>
        <td>{{ accounts.find(a => a.id === s.accountId)?.code }}</td><td>{{ accounts.find(a => a.id === s.accountId)?.name }}</td>
        <td>{{ sideLabel(s.side) }}</td><td>{{ s.transactionElementCode ?? '—' }}</td><td>{{ s.typeCode === 'FIXED' ? '고정' : s.typeCode || (s.isFixed ? '고정' : '일반') }}</td><td>{{ s.isActive ? '사용' : '미사용' }}</td>
        <td @click.stop><UiButton size="small" variant="ghost" @click="$emit('delete', s)">삭제</UiButton></td>
      </tr><tr v-if="!rows.length"><td colspan="9" class="am-empty">조건에 맞는 적요가 없습니다.</td></tr></tbody>
    </table>
  </div>
</template>



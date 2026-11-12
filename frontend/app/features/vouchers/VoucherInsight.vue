<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { voucherSession } from './session'
import { clients, historyRows } from './mockData'
import { checks, money, total } from './model'
import VoucherEvidence from './VoucherEvidence.vue'
import VoucherHistory from './VoucherHistory.vue'
const { activeTab } = useWorkspaceContext()
const session = voucherSession(activeTab.value)
const row = computed(() => session.rows.find(item => item.id === session.selected))
const client = computed(() => clients.find(item => item.code === row.value?.client))
const recent = computed(() => historyRows.find(item => item.client === row.value?.client))
const tabs = ['거래처 정보', '전표 검증', '증빙자료', '과거 전표']
const mode = activeTab.value.id === 'sales' ? 'sales' : 'general'
function jump(key: string) { session.focusKey = key; session.focusRequest++; if (window.innerWidth < 1024) activeTab.value.panel = false }
</script>
<template><div class="voucher-insight"><div class="voucher-section-title"><small>선택 전표 {{ row?.number || '—' }}</small><UiButton :aria-pressed="session.pinned" @click="session.pinned = !session.pinned">{{ session.pinned ? '고정 해제' : '탭 고정' }}</UiButton></div><div class="voucher-insight-tabs" role="tablist" aria-label="전표 인사이트"><button v-for="name in tabs" :key="name" role="tab" :aria-selected="session.insight === name" @click="session.insight = name">{{ name }}</button></div>
<div v-if="!row" class="voucher-empty">전표 행을 선택하면 관련 정보를 확인할 수 있습니다.</div>
<div v-else role="tabpanel" :aria-label="session.insight">
<template v-if="session.insight === '거래처 정보'"><template v-if="client"><h3>{{ client.name }}</h3><UiBadge tone="neutral">{{ client.category }} · {{ client.tax }}</UiBadge><dl><dt>거래처 코드</dt><dd>{{ client.code }}</dd><dt>사업자번호</dt><dd>{{ client.registration }}</dd><dt>최근 거래일</dt><dd>{{ recent?.date || '—' }}</dd><dt>최근 거래금액</dt><dd>{{ recent ? money(recent.debit) + ' 원' : '—' }}</dd><dt>선택 월 거래 건수</dt><dd>{{ new Set(session.rows.filter(item => item.client === client?.code && item.date.slice(0, 7) === row?.date.slice(0, 7)).map(item => item.date + item.number)).size }}건</dd><dt>미지급금 예시</dt><dd>{{ money(client.balance) }} 원</dd></dl></template><p v-else>거래처를 선택해 주세요.</p></template>
<template v-else-if="session.insight === '전표 검증'"><p class="muted">Mock 입력 확인 · 실제 회계·세법 검증 아님</p><button v-for="check in checks(session.rows, row, mode)" :key="check.label" class="voucher-check" @click="jump(check.key)"><span>{{ check.label }}</span><strong :class="check.ok ? 'good' : check.label === '차변·대변 일치' || check.label === '필수 항목' ? 'bad' : 'warn'">{{ check.ok ? '정상' : check.label === '차변·대변 일치' || check.label === '필수 항목' ? '오류' : '확인 필요' }} →</strong></button><p v-if="mode === 'sales'">공급가액 {{ money(row.supply) }} + 부가세 {{ money(row.vat) }} = {{ money(total(row)) }} 원</p></template>
<VoucherEvidence v-else-if="session.insight === '증빙자료'" :row="row" />
<VoucherHistory v-else :row="row" />
</div></div></template>

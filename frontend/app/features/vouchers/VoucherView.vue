<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { voucherSession } from './session'
import { blankRow, saveMockRows } from './mockData'
import { group, type Mode, type VoucherRow } from './model'
import VoucherGrid from './VoucherGrid.vue'
import VoucherDetail from './VoucherDetail.vue'
import './vouchers.css'
const props = defineProps<{ mode: Mode }>()
const { activeTab, company, user, setDirty, density } = useWorkspaceContext()
const tab = activeTab.value
const session = voucherSession(tab)
const grid = ref<InstanceType<typeof VoucherGrid>>()
const notice = ref('')
const deleting = ref(false)
const filtered = computed(() => session.rows.filter(row => (!session.from || row.date >= session.from) && (!session.to || row.date <= session.to)))
const selected = computed(() => session.rows.find(row => row.id === session.selected))
const preferencesReady = ref(false)
const preferenceKey = `accounting-pro:vouchers:${user}:${props.mode}`
onMounted(() => {
  if (!session.initialized) {
    tab.panelWidth = 340; tab.panel = window.innerWidth > 1280
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}')
      if (typeof saved.width === 'number' && Number.isFinite(saved.width)) tab.panelWidth = Math.min(480, Math.max(300, saved.width))
      if (typeof saved.open === 'boolean' && window.innerWidth > 1280) tab.panel = saved.open
      if (typeof saved.detail === 'boolean') session.detail = saved.detail
      if (typeof saved.pinned === 'boolean') session.pinned = saved.pinned
    } catch { /* Preferences are optional; retain session defaults. */ }
    session.initialized = true
  }
  preferencesReady.value = true
})
watch(() => [tab.panelWidth, tab.panel, session.detail, session.pinned], () => {
  if (!preferencesReady.value) return
  try { localStorage.setItem(preferenceKey, JSON.stringify({ width: tab.panelWidth, open: tab.panel, detail: session.detail, pinned: session.pinned })) }
  catch { notice.value = 'UI 설정을 저장할 수 없어 이번 탭에서만 유지됩니다.' }
})
function edit(id: string, key: keyof VoucherRow, value: string) { const row = session.rows.find(row => row.id === id); if (row && row[key] !== value) { Object.assign(row, { [key]: value }); setDirty(tab); notice.value = '' } }
function select(id: string, key: string) { session.selected = id; if (!session.pinned) { if (key.startsWith('client')) session.insight = '거래처 정보'; if (key === 'evidence') session.insight = '증빙자료' } }
function add() {
  if (!grid.value?.finalize()) return
  const number = String(Math.max(0, ...session.rows.map(row => Number(row.number) || 0)) + 1).padStart(5, '0')
  const row = blankRow(crypto.randomUUID(), session.from || '2026-11-10', number)
  if (props.mode === 'sales') row.kind = '51'
  session.rows.push(row); session.selected = row.id; setDirty(tab)
  nextTick(() => grid.value?.focusKey(row.id, 'date'))
}
function remove() { session.rows = session.rows.filter(row => !session.checked.includes(row.id)); if (!session.rows.some(row => row.id === session.selected)) session.selected = ''; session.checked = []; deleting.value = false; setDirty(tab) }
function save() { if (!grid.value?.finalize()) return; session.rows = saveMockRows(session.rows); setDirty(tab, false); notice.value = 'Mock 저장 완료 · 현재 탭 메모리에만 보관됩니다.' }
watch(() => session.focusRequest, () => { if (selected.value) { session.from = ''; session.to = ''; nextTick(() => grid.value?.focusKey(session.selected, session.focusKey)) } })
</script>
<template>
  <div class="voucher-screen" :class="{ 'voucher-compact': density === 'compact' }">
    <PageToolbar :title="mode === 'general' ? '일반전표입력' : '매입매출전표 입력 · Mock'" description="연속 입력과 전표 인사이트를 한 화면에서 확인하세요."><template #eyebrow>ACCOUNTING / VOUCHERS</template><UiBadge tone="neutral">Mock 프로토타입</UiBadge><UiButton @click="tab.panel = !tab.panel">{{ tab.panel ? '인사이트 닫기' : '인사이트 열기' }}</UiButton><UiButton variant="primary" @click="save">Mock 저장</UiButton></PageToolbar>
    <div class="voucher-toolbar"><span>{{ company === 'demo-happy' ? '(주)행복상사' : '(주)우리상사' }} · 2026 회계연도</span><label>조회기간 <input v-model="session.from" type="date" aria-label="조회 시작일"></label><span>~</span><input v-model="session.to" type="date" aria-label="조회 종료일"><UiButton class="voucher-edit-action" @click="add">+ 행 추가</UiButton><UiButton class="voucher-edit-action" :disabled="!session.checked.length" @click="deleting = true">선택 삭제 ({{ session.checked.length }})</UiButton><UiBadge v-if="tab.dirty" tone="warning">미저장 변경</UiBadge></div>
    <div class="voucher-section-title"><p class="voucher-help">셀 클릭 / F2 편집 · Enter / Tab 이동 · 방향키 탐색 · Esc 취소 · 코드 입력란에서 계정·거래처 검색</p><label>밀도 <select v-model="density" aria-label="테이블 밀도"><option value="normal">기본</option><option value="compact">좁게</option></select></label></div>
    <p v-if="notice" role="status" class="good">{{ notice }}</p>
    <VoucherGrid ref="grid" :rows="filtered" :mode="mode" :selected="session.selected" :checked="session.checked" @edit="edit" @select="select" @check="id => session.checked = session.checked.includes(id) ? session.checked.filter(value => value !== id) : [...session.checked, id]" />
    <div class="voucher-section-title"><strong>선택 전표 {{ selected?.number || '—' }} · {{ filtered.length }}행</strong><UiButton @click="session.detail = !session.detail">{{ session.detail ? '분개 상세 접기' : '분개 상세 펼치기' }}</UiButton></div>
    <VoucherDetail v-if="session.detail" :rows="group(session.rows, selected)" :mode="mode" />
    <p class="muted">가상 거래 · 저장·수정·삭제는 탭 메모리에서만 처리합니다. 새로고침하면 초기화됩니다. 검증은 화면 확인용이며 회계·세법 검증이 아닙니다.</p>
    <ConfirmDialog :open="deleting" title="선택 행 삭제 확인" :message="`선택한 ${session.checked.length}행을 삭제할까요? 같은 전표의 다른 분개 행은 남을 수 있습니다.`" confirm-label="삭제 확인" @cancel="deleting = false" @confirm="remove" />
  </div>
</template>


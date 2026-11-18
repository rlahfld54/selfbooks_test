<script setup lang="ts">
import { useWorkspaceProvider } from '~/features/workspace/composables/useWorkspaceProvider'
import WorkspaceConfirmation from './WorkspaceConfirmation.vue'
import WorkspaceDetail from './WorkspaceDetail.vue'
import { managementSession } from '~/features/management/session'
import { tabInfo, type TabId } from '~/utils/workspace-routes'
const { state, navigate, requestClose, generation, density, clientId, routeAllowed, reloadDirectory } = useWorkspaceProvider()
const directoryData = managementSession(state)
const selectedClient = computed(() => directoryData.clients.find(client => client.id === clientId.value))
const mobileOpen = ref(false)
const clientWorkVisible = computed(() => !!clientId.value && !['home', 'clients', 'mypage', 'organization'].includes(state.active))
const notice = ref('')
const groups: { title: string; items: { id: TabId; symbol: string }[] }[] = [
  { title: 'WORKSPACE', items: [{ id: 'home', symbol: '▦' }] },
  { title: 'ORGANIZATION', items: [{ id: 'clients', symbol: '▤' }, { id: 'organization', symbol: '▧' }] },
  { title: 'ACCOUNTING', items: [{ id: 'company', symbol: '▣' }, { id: 'settings', symbol: '⚙' }, { id: 'accounts', symbol: '▤' }, { id: 'voucher', symbol: '▥' }, { id: 'sales-journal', symbol: '▥' }] },
  { title: 'PERSONAL', items: [{ id: 'mypage', symbol: '◉' }] },
]
async function open(id: TabId) {
  if (await navigate(id)) mobileOpen.value = false
}
</script>
<template>
  <div class="reference-workspace app">
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <div class="brand"><AatBrand /></div>
      <div class="workspace-select"><button class="org-switch" @click="open('organization')"><span class="circle">원</span><span><strong>회계법인 원지</strong><small>관리자 워크스페이스</small></span><span class="chev">⌄</span></button></div>
      <nav class="nav" aria-label="업무 메뉴">
        <template v-for="group in groups" :key="group.title">
          <div class="nav-label">{{ group.title }}</div>
          <button v-for="item in group.items" :key="item.id" :class="{ active: state.active === item.id }" @click="open(item.id)"><span class="sym">{{ item.symbol }}</span>{{ tabInfo(item.id).title }}</button>
        </template>
      </nav>
      <div class="sidebar-user"><button class="profile-mini" @click="open('mypage')"><span class="avatar">김</span><span><b>김원지</b><small>조직 관리자</small></span><span class="chev">⋯</span></button></div>
    </aside>
    <div class="main">
      <header class="topbar"><div class="breadcrumbs"><button class="icon-btn mobile-toggle" aria-label="메뉴 열기" @click="mobileOpen = !mobileOpen">☰</button>회계법인 원지 <span>›</span><strong>{{ tabInfo(state.active).title }}</strong></div><div class="top-right"><span class="top-pill">{{ state.active === 'clients' ? '● 실제 업체 조회' : '● 업무 시안' }}</span><button class="icon-btn" title="테이블 밀도 전환" @click="density = density === 'normal' ? 'compact' : 'normal'">▤</button><button class="icon-btn" aria-label="알림" @click="notice = '새로운 알림이 없습니다.'">♧</button><button class="avatar" aria-label="마이페이지" @click="open('mypage')">김</button></div></header>
      <div class="workspace-tabs" role="tablist" aria-label="열린 업무"><div v-for="tab in state.tabs" :key="tab.id" class="ws-tab" :class="{ active: state.active === tab.id }"><button role="tab" :aria-selected="state.active === tab.id" @click="open(tab.id)">{{ tabInfo(tab.id).title }}{{ tab.dirty ? ' •' : '' }}</button><button v-if="tab.id !== 'home'" class="x" :aria-label="tabInfo(tab.id).title + ' 닫기'" @click="requestClose(tab.id)">×</button></div></div>
      <div class="reference-body"><main class="content"><div class="page" :key="generation"><p v-if="notice" role="status" @click="notice = ''">{{ notice }}</p><p v-if="clientWorkVisible" class="alert" role="status">{{ selectedClient?.name }} · 업체별 업무 연동 준비 중입니다. 기존 회계 화면의 조회·저장은 서버에 설정된 회사 기준으로 동작합니다.</p><slot v-if="routeAllowed" /><p v-else-if="['idle', 'pending'].includes(directoryData.directory.status)" role="status">업체 정보를 불러오는 중입니다.</p><div v-else-if="directoryData.directory.error" role="alert">{{ directoryData.directory.error }} <button class="btn" @click="reloadDirectory()">다시 시도</button></div><div v-else role="alert">업체가 없거나 접근 권한이 없습니다. <NuxtLink to="/client-directory?tab=mine">내 담당 업체 선택</NuxtLink></div></div></main><WorkspaceDetail :key="generation + ':' + state.active" /></div>
    </div>
    <WorkspaceConfirmation />
  </div>
</template>


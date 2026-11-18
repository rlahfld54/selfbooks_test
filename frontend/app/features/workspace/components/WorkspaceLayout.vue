<script setup lang="ts">
import { useWorkspaceProvider } from '~/features/workspace/composables/useWorkspaceProvider'
import WorkspaceConfirmation from './WorkspaceConfirmation.vue'
import WorkspaceDetail from './WorkspaceDetail.vue'
import { tabInfo, type TabId } from '~/utils/workspace-routes'
const { state, navigate, requestClose, generation, density } = useWorkspaceProvider()
const mobileOpen = ref(false)
const notice = ref('')
const groups: { title: string; items: { id: TabId; symbol: string }[] }[] = [
  { title: 'WORKSPACE', items: [{ id: 'home', symbol: '▦' }] },
  { title: 'ORGANIZATION', items: [{ id: 'clients', symbol: '▤' }, { id: 'organization', symbol: '▧' }] },
  { title: 'ACCOUNTING', items: [{ id: 'company', symbol: '▣' }, { id: 'settings', symbol: '⚙' }, { id: 'collection', symbol: '⇩' }, { id: 'voucher', symbol: '▥' }, { id: 'sales-journal', symbol: '▥' }] },
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
      <header class="topbar"><div class="breadcrumbs"><button class="icon-btn mobile-toggle" aria-label="메뉴 열기" @click="mobileOpen = !mobileOpen">☰</button>회계법인 원지 <span>›</span><strong>{{ tabInfo(state.active).title }}</strong></div><div class="top-right"><span class="top-pill">● 데모 데이터</span><button class="icon-btn" title="테이블 밀도 전환" @click="density = density === 'normal' ? 'compact' : 'normal'">▤</button><button class="icon-btn" aria-label="알림" @click="notice = '새로운 알림이 없습니다.'">♧</button><button class="avatar" aria-label="마이페이지" @click="open('mypage')">김</button></div></header>
      <div class="workspace-tabs" role="tablist" aria-label="열린 업무"><div v-for="tab in state.tabs" :key="tab.id" class="ws-tab" :class="{ active: state.active === tab.id }"><button role="tab" :aria-selected="state.active === tab.id" @click="open(tab.id)">{{ tabInfo(tab.id).title }}{{ tab.dirty ? ' •' : '' }}</button><button v-if="tab.id !== 'home'" class="x" :aria-label="tabInfo(tab.id).title + ' 닫기'" @click="requestClose(tab.id)">×</button></div></div>
      <div class="reference-body"><main class="content"><div class="page" :key="generation"><p v-if="notice" role="status" @click="notice = ''">{{ notice }}</p><slot /></div></main><WorkspaceDetail :key="generation + ':' + state.active" /></div>
    </div>
    <WorkspaceConfirmation />
  </div>
</template>

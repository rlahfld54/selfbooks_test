<script setup lang="ts">
import { pageActionsKey } from '~/composables/usePageActions'
import type { Slots } from 'vue'
import { useWorkspaceProvider } from '~/features/workspace/composables/useWorkspaceProvider'
import WorkspaceConfirmation from './WorkspaceConfirmation.vue'
import WorkspaceDetail from './WorkspaceDetail.vue'
import { managementSession } from '~/features/management/session'
import { tabInfo, type TabId } from '~/utils/workspace-routes'
const {
  state,
  navigate,
  requestClose,
  generation,
  density,
  collapsed,
  clientId,
  routeAllowed,
  reloadDirectory,
} = useWorkspaceProvider()
const pageActions = shallowRef<Slots | null>(null)
provide(pageActionsKey, pageActions)
const PageDeleteAction = () => pageActions.value?.delete?.()
const PageLastAction = () => pageActions.value?.last?.()
const directoryData = managementSession(state)
const selectedClient = computed(() =>
  directoryData.clients.find((client) => client.id === clientId.value),
)
const mobileOpen = ref(false)
const clientWorkVisible = computed(
  () =>
    !!clientId.value &&
    !['home', 'clients', 'mypage', 'organization', 'collection'].includes(state.active),
)
const notice = ref('')
const groups: { title: string; items: { id: TabId; symbol: string }[] }[] = [
  {
    title: 'MENU',
    items: [
      { id: 'home', symbol: '▦' },
      { id: 'settings', symbol: '⚙' },
      { id: 'accounts', symbol: '▤' },
      { id: 'collection', symbol: '⇩' },
      { id: 'voucher', symbol: '▥' },
      { id: 'sales-journal', symbol: '▥' },
      { id: 'reports', symbol: '▤' },
      { id: 'mypage', symbol: '◉' },
      { id: 'clients', symbol: '▤' },
      { id: 'organization', symbol: '▧' },
    ],
  },
]
async function open(id: TabId) {
  if (await navigate(id)) mobileOpen.value = false
}
</script>
<template>
  <div class="reference-workspace app">
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen, collapsed }">
      <div class="brand">
        <AatBrand v-if="!collapsed" />
        <button
          class="sidebar-collapse"
          :aria-label="collapsed ? '사이드바 펼치기' : '사이드바 접기'"
          :aria-expanded="!collapsed"
          @click="collapsed = !collapsed">
          {{ collapsed ? '›' : '‹' }}
        </button>
      </div>

      <nav class="nav" aria-label="업무 메뉴">
        <template v-for="group in groups" :key="group.title">
          <div class="nav-label">{{ group.title }}</div>
          <button
            v-for="item in group.items"
            :key="item.id"
            :title="tabInfo(item.id).title"
            :aria-label="tabInfo(item.id).title"
            :class="{ active: state.active === item.id }"
            @click="open(item.id)">
            <span class="sym">{{ item.symbol }}</span>
            <span class="nav-text">{{ tabInfo(item.id).title }}</span>
          </button>
        </template>
      </nav>
      <div class="sidebar-user">
        <button class="profile-mini" @click="open('mypage')">
          <span class="avatar">김</span>
          <span>
            <b>김원지</b>
            <small>조직 관리자</small>
          </span>
          <span class="chev">⋯</span>
        </button>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="breadcrumbs">
          <button
            class="icon-btn mobile-toggle"
            aria-label="메뉴 열기"
            @click="mobileOpen = !mobileOpen">
            ☰
          </button>
          회계법인 원지
          <span>›</span>
          <strong>{{ tabInfo(state.active).title }}</strong>
        </div>
        <div class="top-right">
          <CommonPageActions>
            <template v-if="pageActions?.delete" #delete><PageDeleteAction /></template>
          </CommonPageActions>
          <PageLastAction />
        </div>
      </header>
      <div class="workspace-tabs" role="tablist" aria-label="열린 업무">
        <div
          v-for="tab in state.tabs"
          :key="tab.id"
          class="ws-tab"
          :class="{ active: state.active === tab.id }">
          <button role="tab" :aria-selected="state.active === tab.id" @click="open(tab.id)">
            {{ tabInfo(tab.id).title }}{{ tab.dirty ? ' •' : '' }}
          </button>
          <button
            v-if="tab.id !== 'home'"
            class="x"
            :aria-label="tabInfo(tab.id).title + ' 닫기'"
            @click="requestClose(tab.id)">
            ×
          </button>
        </div>
      </div>
      <div class="reference-body">
        <main class="content">
          <div class="page" :key="generation">
            <p v-if="notice" role="status" @click="notice = ''">{{ notice }}</p>
            <p v-if="clientWorkVisible" class="alert" role="status">
              {{ selectedClient?.name }} · 업체별 업무 연동 준비 중입니다. 기존 회계 화면의
              조회·저장은 서버에 설정된 회사 기준으로 동작합니다.
            </p>
            <slot v-if="routeAllowed" />
            <p
              v-else-if="['idle', 'pending'].includes(directoryData.directory.status)"
              role="status">
              업체 정보를 불러오는 중입니다.
            </p>
            <div v-else-if="directoryData.directory.error" role="alert">
              {{ directoryData.directory.error }}
              <button class="btn" @click="reloadDirectory()">다시 시도</button>
            </div>
            <div v-else role="alert">
              업체가 없거나 접근 권한이 없습니다.
              <NuxtLink to="/client-directory?tab=mine">내 담당 업체 선택</NuxtLink>
            </div>
          </div>
        </main>
        <WorkspaceDetail :key="generation + ':' + state.active" />
      </div>
    </div>
    <WorkspaceConfirmation />
  </div>
</template>

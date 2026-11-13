<script setup lang="ts">
import WorkspaceSidebar from '~/features/workspace/components/WorkspaceSidebar.vue'
import WorkspaceHeader from '~/features/workspace/components/WorkspaceHeader.vue'
import WorkspaceTabs from '~/features/workspace/components/WorkspaceTabs.vue'
import WorkspaceDetail from '~/features/workspace/components/WorkspaceDetail.vue'
import WorkspaceConfirmation from '~/features/workspace/components/WorkspaceConfirmation.vue'
import { useWorkspaceProvider } from '~/features/workspace/composables/useWorkspaceProvider'
import { useMobileWorkspace } from '~/features/workspace/composables/useMobileWorkspace'
import { tabInfo } from '~/utils/workspace-routes'

const { generation, state, activeTab, collapsed, storageAvailable } = useWorkspaceProvider()
const { mobileOpen, narrow, sidebar } = useMobileWorkspace()
const overlayPanel = computed(() => narrow.value && activeTab.value.panel)
const backgroundInert = computed(() => overlayPanel.value || mobileOpen.value)
</script>

<template>
  <ClientOnly>
  <div class="app-shell" :class="{ collapsed, 'mobile-menu-open': mobileOpen }">
    <a href="#main-content" class="skip-link" :inert="backgroundInert">본문으로 이동</a>
    <button v-if="mobileOpen" class="mobile-backdrop" aria-label="메뉴 닫기" @click="mobileOpen = false" />
    <aside ref="sidebar" class="sidebar" aria-label="주 메뉴" :inert="overlayPanel">
      <WorkspaceSidebar @close="mobileOpen = false" />
    </aside>
    <div class="app-main">
      <WorkspaceHeader
        :title="tabInfo(state.active).title"
        :inert="backgroundInert"
        @toggle-menu="mobileOpen = !mobileOpen"
      />
      <WorkspaceTabs :inert="backgroundInert" />
      <div class="workspace-body">
        <main id="main-content" tabindex="-1" class="page-content" :inert="backgroundInert">
          <div v-if="!storageAvailable" class="info-banner" role="status">
            브라우저 저장소를 사용할 수 없어 UI 설정이 이번 세션에만 유지됩니다.
          </div>
          <div
            :id="'page-' + state.active"
            :key="generation"
            role="tabpanel"
            :aria-labelledby="'tab-' + state.active"
            tabindex="0"
          >
            <slot />
          </div>
        </main>
        <WorkspaceDetail :key="generation + ':' + state.active" />
      </div>
      <footer class="app-footer" :inert="backgroundInert">
        <span><i />{{ state.active === 'sales-journal' ? '로컬 개발 · 해솔문구 전표 DB 연결' : state.active === 'clients' ? '로컬 개발 · Fastify 읽기 전용' : '샘플 모드 · 실제 데이터와 연결되지 않음' }}</span>
        <span>Accounting Pro <span class="footer-version">v1.0</span></span>
      </footer>
    </div>
    <WorkspaceConfirmation />
  </div>
  </ClientOnly>
</template>

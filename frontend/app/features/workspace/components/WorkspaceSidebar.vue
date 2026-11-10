<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { menu, tabInfo, type TabId } from '~/utils/workspace-routes'
const emit = defineEmits<{ close: [] }>()
const { state, collapsed, navigate } = useWorkspaceContext()
const groups = reactive({ accounting: true, trading: true })
async function open(id: TabId) {
  if (await navigate(id)) emit('close')
}
</script>
<template>
      <a class="brand" :href="tabInfo('home').path" aria-label="Accounting Pro 홈" @click.prevent="open('home')"
        ><span class="brand-mark"><i /><i /><i /></span
        ><span class="sidebar-label"
          >Accounting<span>Pro<span class="brand-period">.</span></span></span
        ></a
      >
      <div class="sidebar-section-label sidebar-label">WORKSPACE</div>
      <nav>
        <button class="nav-item mobile-close" @click="emit('close')">
          <UiIcon name="close" />메뉴 닫기</button
        ><button
          class="nav-item"
          :class="{ active: state.active === 'home' }"
          title="홈"
          @click="open('home')"
        >
          <UiIcon name="home" /><span class="sidebar-label">홈</span></button
        ><button
          class="nav-item group-toggle"
          :aria-expanded="groups.accounting"
          title="회계관리"
          @click="collapsed ? open('voucher') : (groups.accounting = !groups.accounting)"
        >
          <UiIcon name="document" /><span class="sidebar-label">회계관리</span
          ><UiIcon
            name="chevron"
            class="sidebar-label group-chevron"
            :class="{ expanded: groups.accounting }"
            :size="14"
          />
        </button>
        <div v-if="groups.accounting || collapsed" class="subnav">
          <button
            v-for="id in ['voucher', 'sales-journal', 'ledger'] as const"
            :key="id"
            :class="{ active: state.active === id }"
            :title="tabInfo(id).title"
            @click="open(id)"
          >
            <span class="subnav-dot" /><span class="sidebar-label">{{
              tabInfo(id).title
            }}</span
            ><span v-if="collapsed" class="mini-label">{{
              id === 'voucher' ? '입력' : id === 'sales-journal' ? '매입출' : '조회'
            }}</span>
          </button>
        </div>
        <button
          class="nav-item group-toggle"
          :aria-expanded="groups.trading"
          title="매입매출관리"
          @click="collapsed ? open('sales') : (groups.trading = !groups.trading)"
        >
          <UiIcon name="bag" /><span class="sidebar-label">매입매출관리</span
          ><UiIcon
            name="chevron"
            class="sidebar-label group-chevron"
            :class="{ expanded: groups.trading }"
            :size="14"
          />
        </button>
        <div v-if="groups.trading || collapsed" class="subnav">
          <button
            v-for="id in ['sales', 'partners', 'clients'] as const"
            :key="id"
            :class="{ active: state.active === id }"
            :title="tabInfo(id).title"
            @click="open(id)"
          >
            <span class="subnav-dot" /><span class="sidebar-label">{{
              id === 'sales' ? '매입매출 조회' : id === 'clients' ? '수임업체관리' : '거래처관리'
            }}</span
            ><span v-if="collapsed" class="mini-label">{{
              id === 'sales' ? '매출' : id === 'clients' ? '수임업체' : '거래처'
            }}</span>
          </button>
        </div>
        <button
          v-for="item in menu.filter((item) =>
            ['payroll', 'tax', 'reports', 'settings'].includes(item.id),
          )"
          :key="item.id"
          class="nav-item"
          :class="{ active: state.active === item.id }"
          :title="item.title"
          @click="open(item.id)"
        >
          <UiIcon :name="item.icon" /><span class="sidebar-label">{{ item.title }}</span>
        </button>
        <div class="nav-divider" />
        <button
          class="nav-item"
          :class="{ active: state.active === 'components' }"
          title="UI 컴포넌트"
          @click="open('components')"
        >
          <UiIcon name="grid" /><span class="sidebar-label">UI 컴포넌트</span>
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-help">
          <UiIcon name="help" :size="22" />
          <div class="sidebar-label">
            <strong>더 쉬운 회계의 시작</strong><span>SelfBooks UI Preview</span>
          </div>
        </div>
        <button
          class="collapse-toggle"
          :aria-label="collapsed ? '사이드바 펼치기' : '사이드바 접기'"
          @click="collapsed = !collapsed"
        >
          <UiIcon name="menu" :size="17" /><span class="sidebar-label">사이드바 접기</span>
        </button>
      </div>
    </template>

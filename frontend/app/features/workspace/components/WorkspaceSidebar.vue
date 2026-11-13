<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { tabInfo, workspaceMenuGroups, type TabId } from '~/utils/workspace-routes'

const emit = defineEmits<{ close: [] }>()
const { state, collapsed, navigate } = useWorkspaceContext()
const groups = workspaceMenuGroups
const expanded = reactive([false, true])
const otherItems = (['collection', 'tax', 'closing', 'reports', 'payroll', 'clients', 'sales', 'components'] as const).map(tabInfo)
async function open(id: TabId) {
  if (await navigate(id)) emit('close')
}
</script>

<template>
  <a class="brand" :href="tabInfo('home').path" aria-label="Accounting Pro 대시보드" @click.prevent="open('home')">
    <AatBrand :compact="collapsed" inverse />
  </a>
  <div class="sidebar-section-label sidebar-label">MAIN MENU</div>
  <nav aria-label="업무 메뉴">
    <button class="nav-item mobile-close" @click="emit('close')"><UiIcon name="close" />메뉴 닫기</button>
    <button class="nav-item" :class="{ active: state.active === 'home' }" title="대시보드" @click="open('home')">
      <UiIcon name="home" /><span class="sidebar-label">대시보드</span>
    </button>
    <template v-for="(group, index) in groups" :key="group.title">
      <button
        class="nav-item group-toggle"
        :class="{ active: !expanded[index] && group.items.some(item => item.id === state.active) }"
        :aria-expanded="expanded[index] || (collapsed && index === 1)"
        :title="group.title"
        @click="collapsed && index === 1 ? open('voucher') : (expanded[index] = !expanded[index])"
      >
        <UiIcon :name="group.icon" /><span class="sidebar-label">{{ group.title }}</span>
        <UiIcon name="chevron" class="sidebar-label group-chevron" :class="{ expanded: expanded[index] }" :size="14" />
      </button>
      <div v-if="expanded[index] || (collapsed && index === 1)" class="subnav">
        <button
          v-for="item in group.items"
          :key="item.id"
          :class="{ active: state.active === item.id }"
          :aria-current="state.active === item.id ? 'page' : undefined"
          :aria-label="item.label"
          :title="item.label"
          @click="open(item.id)"
        >
          <span class="subnav-dot" /><span class="sidebar-label">{{ item.label }}</span>
          <span v-if="collapsed" class="mini-label">{{ 'short' in item ? item.short : item.label.slice(0, 2) }}</span>
        </button>
      </div>
    </template>
    <template v-for="item in otherItems" :key="item.id">
      <div v-if="item.id === 'components'" class="nav-divider" />
      <button class="nav-item" :class="{ active: state.active === item.id }" :title="item.title" @click="open(item.id)">
        <UiIcon :name="item.icon" /><span class="sidebar-label">{{ item.title }}</span>
      </button>
    </template>
  </nav>
  <div class="sidebar-bottom">
    <button class="collapse-toggle" :aria-label="collapsed ? '사이드바 펼치기' : '사이드바 접기'" @click="collapsed = !collapsed">
      <UiIcon name="menu" :size="17" /><span class="sidebar-label">사이드바 접기</span>
    </button>
  </div>
</template>

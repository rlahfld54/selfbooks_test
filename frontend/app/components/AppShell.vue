<script setup lang="ts">
import { menu, type TabId } from '~/utils/workspace'
import { companyPartners } from '~/data/demo'
const workspace = useWorkspace()
const { state, company, activeTab, collapsed, density, pending, storageAvailable } = workspace
const mobileOpen = ref(false)
const narrow = ref(false)
const overlayPanel = computed(() => narrow.value && activeTab.value.panel)
let media: MediaQueryList | undefined
function updateNarrow() {
  narrow.value = media?.matches ?? false
}
function escapeMenu(event: KeyboardEvent) {
  if (!mobileOpen.value) return
  if (event.key === 'Escape') mobileOpen.value = false
  if (event.key === 'Tab') {
    const items = [...document.querySelectorAll<HTMLElement>('.sidebar a, .sidebar button')].filter(
      (item) => item.getClientRects().length > 0,
    )
    const first = items[0],
      last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
}
watch(mobileOpen, async (value) => {
  await nextTick()
  document.querySelector<HTMLElement>(value ? '.sidebar .brand' : '.mobile-toggle')?.focus()
})
onMounted(() => {
  media = matchMedia('(max-width: 1023px)')
  updateNarrow()
  media.addEventListener('change', updateNarrow)
  document.addEventListener('keydown', escapeMenu)
})
onBeforeUnmount(() => {
  media?.removeEventListener('change', updateNarrow)
  document.removeEventListener('keydown', escapeMenu)
})
const groups = ref<Record<string, boolean>>({ accounting: true, trading: true })
const toast = ref('')
const notifications = ref(false)
const companies = [
  { value: 'demo-happy', label: '(주)행복상사 · 데모' },
  { value: 'demo-woori', label: '(주)우리상사 · 데모' },
]
const selectedPartner = computed(() =>
  companyPartners(company.value).find((row) => row.id === activeTab.value.selected),
)
const activeTitle = computed(() => menu.find((item) => item.id === state.active)?.title || '홈')
function open(id: TabId) {
  workspace.open(id)
  mobileOpen.value = false
}
function tabKeys(event: KeyboardEvent, index: number) {
  let target = index
  if (event.key === 'ArrowRight') target = (index + 1) % state.tabs.length
  else if (event.key === 'ArrowLeft') target = (index - 1 + state.tabs.length) % state.tabs.length
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = state.tabs.length - 1
  else if (event.key === 'Delete') {
    workspace.requestClose(state.tabs[index]!.id)
    return
  } else return
  event.preventDefault()
  const id = state.tabs[target]!.id
  workspace.open(id)
  nextTick(() => document.getElementById('tab-' + id)?.focus())
}
watch(
  () => state.active,
  () =>
    nextTick(() =>
      document
        .getElementById('tab-' + state.active)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
    ),
)
function selectDetail(id: string) {
  activeTab.value.selected = id
}
</script>
<template>
  <div class="app-shell" :class="{ collapsed, 'mobile-menu-open': mobileOpen }">
    <a href="#main-content" class="skip-link">본문으로 이동</a
    ><button
      v-if="mobileOpen"
      class="mobile-backdrop"
      aria-label="메뉴 닫기"
      @click="mobileOpen = false"
    />
    <aside class="sidebar" aria-label="주 메뉴" :inert="overlayPanel">
      <a class="brand" href="#" aria-label="Accounting Pro 홈" @click.prevent="open('home')"
        ><span class="brand-mark"><i /><i /><i /></span
        ><span class="sidebar-label"
          >Accounting<span>Pro<span class="brand-period">.</span></span></span
        ></a
      >
      <div class="sidebar-section-label sidebar-label">WORKSPACE</div>
      <nav>
        <button class="nav-item mobile-close" @click="mobileOpen = false">
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
            v-for="id in ['voucher', 'ledger'] as const"
            :key="id"
            :class="{ active: state.active === id }"
            :title="menu.find((m) => m.id === id)?.title"
            @click="open(id)"
          >
            <span class="subnav-dot" /><span class="sidebar-label">{{
              menu.find((m) => m.id === id)?.title
            }}</span
            ><span v-if="collapsed" class="mini-label">{{
              id === 'voucher' ? '입력' : '조회'
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
            :title="menu.find((m) => m.id === id)?.title"
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
    </aside>
    <div class="app-main">
      <header class="app-header" :inert="overlayPanel || mobileOpen">
        <div class="header-left">
          <UiButton
            class="mobile-toggle"
            variant="ghost"
            aria-label="메뉴 열기"
            @click="mobileOpen = !mobileOpen"
            ><UiIcon name="menu" /></UiButton
          ><UiIcon name="home" :size="17" /><span class="breadcrumb-separator">/</span
          ><span>{{ activeTitle }}</span>
        </div>
        <div class="header-right">
          <UiSelect
            aria-label="샘플 회사 선택"
            :model-value="company"
            :options="companies"
            @update:model-value="workspace.requestCompany($event)"
          /><span class="header-divider" /><UiButton
            variant="ghost"
            aria-label="알림 보기"
            @click="notifications = true"
            ><span class="notification-icon"><UiIcon name="bell" /><i /></span
          ></UiButton>
          <div class="user-avatar">관</div>
          <span class="user-label">관리자 <small>데모 계정</small></span>
        </div>
      </header>
      <div
        class="tab-bar"
        :inert="overlayPanel || mobileOpen"
        role="tablist"
        aria-label="열린 업무"
      >
        <div
          v-for="(tab, index) in state.tabs"
          :key="tab.id"
          class="work-tab"
          :class="{ active: state.active === tab.id }"
        >
          <button
            :id="'tab-' + tab.id"
            role="tab"
            :aria-controls="'page-' + tab.id"
            :aria-selected="state.active === tab.id"
            :tabindex="state.active === tab.id ? 0 : -1"
            @click="workspace.open(tab.id)"
            @keydown="tabKeys($event, index)"
          >
            <UiIcon :name="menu.find((item) => item.id === tab.id)?.icon" :size="15" />{{
              menu.find((item) => item.id === tab.id)?.title
            }}<span v-if="tab.dirty" class="dirty-dot" aria-label="미저장 변경" /></button
          ><button
            v-if="tab.id !== 'home'"
            class="tab-close"
            :aria-label="menu.find((item) => item.id === tab.id)?.title + ' 탭 닫기'"
            @click="workspace.requestClose(tab.id)"
          >
            <UiIcon name="close" :size="13" />
          </button>
        </div>
      </div>
      <div class="workspace-body">
        <main
          id="main-content"
          tabindex="-1"
          class="page-content"
          :inert="overlayPanel || mobileOpen"
        >
          <div v-if="!storageAvailable" class="info-banner" role="status">
            브라우저 저장소를 사용할 수 없어 UI 설정이 이번 세션에만 유지됩니다.
          </div>
          <div
            v-for="tab in state.tabs"
            v-show="state.active === tab.id"
            :id="'page-' + tab.id"
            :key="company + ':' + tab.id"
            role="tabpanel"
            :aria-labelledby="'tab-' + tab.id"
            tabindex="0"
          >
            <HomeDashboard
              v-if="tab.id === 'home'"
              :company="company"
              @open="open"
            /><ComponentGallery v-else-if="tab.id === 'components'" /><WorkPage
              v-else
              :tab="tab"
              :company="company"
              :density="density"
              @update:density="density = $event"
              @notify="toast = $event"
            />
          </div>
        </main>
        <DetailPanel
          :open="activeTab.panel"
          :width="activeTab.panelWidth"
          title="거래처 상세"
          @close="activeTab.panel = false"
          @update:width="activeTab.panelWidth = $event"
          ><UiBadge tone="neutral">샘플 정보</UiBadge>
          <div class="detail-identity">
            <span class="detail-avatar"><UiIcon name="users" :size="30" /></span>
            <h2>{{ selectedPartner?.name || '거래처를 선택하세요' }}</h2>
            <p>{{ selectedPartner?.code || '관련 거래처에서 선택할 수 있습니다.' }}</p>
          </div>
          <dl v-if="selectedPartner" class="detail-list">
            <dt>거래처 코드</dt>
            <dd>{{ selectedPartner.code }}</dd>
            <dt>연락처</dt>
            <dd>{{ selectedPartner.contact }}</dd>
            <dt>최근 거래일</dt>
            <dd>{{ selectedPartner.date }}</dd>
            <dt>거래 상태</dt>
            <dd>
              <UiBadge tone="success">{{ selectedPartner.status }}</UiBadge>
            </dd>
          </dl>
          <h3>관련 거래처</h3>
          <SearchPanel :items="companyPartners(company)" @select="selectDetail($event.id)" />
          <div class="info-banner">이 패널의 정보는 UI 검증용 샘플입니다.</div></DetailPanel
        >
      </div>
      <footer class="app-footer">
        <span><i />샘플 모드 · 실제 데이터와 연결되지 않음</span
        ><span>Accounting Pro <span class="footer-version">v1.0</span></span>
      </footer>
    </div>
    <ConfirmDialog
      :open="!!pending"
      :title="pending?.kind === 'company' ? '회사를 전환할까요?' : '이 탭을 닫을까요?'"
      :message="
        pending?.kind === 'company'
          ? '미저장 입력을 버리고 새 회사의 업무 화면으로 전환합니다.'
          : '이 탭의 미저장 입력이 사라집니다. 계속하시겠습니까?'
      "
      @cancel="pending = null"
      @confirm="workspace.confirm"
    /><UiModal :open="notifications" title="알림" @close="notifications = false"
      ><EmptyState
        title="새로운 알림이 없습니다"
        description="현재 UI 데모에서는 실제 알림을 수신하지 않습니다." /></UiModal
    ><UiToast :message="toast" @close="toast = ''" />
  </div>
</template>

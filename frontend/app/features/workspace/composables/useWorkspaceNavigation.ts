import { isNavigationFailure, type RouteLocationNormalized } from 'vue-router'
import { isDemoCompany, type WorkspaceStore } from '~/features/workspace/stores/workspace'
import { isClientWork } from '~/features/management/client-work'
import { closeDestination, closeTab, openTab, freshWorkspace } from '~/utils/workspace'
import { tabInfo, type TabId } from '~/utils/workspace-routes'
import { useWorkspacePreferences } from './useWorkspacePreferences'

type Confirmation = { kind: 'close' | 'company' | 'navigate'; resolve: (accepted: boolean) => void }
const routeTab = (route: RouteLocationNormalized) => route.meta.workspaceTab

export function useWorkspaceNavigation(store: WorkspaceStore, canAccess: () => boolean, canUseRoute: (route: RouteLocationNormalized) => boolean) {
  const router = useRouter()
  const pending = shallowRef<Confirmation>()
  const resumeTab = ref<TabId>()
  const preferences = useWorkspacePreferences(store, () => resumeTab.value)
  // A one-shot allowance for a tab switch or a confirmed transaction.
  let permit: { path: string; commit?: () => void; accepted?: RouteLocationNormalized } | undefined
  let busy = false

  function ask(kind: Confirmation['kind']) {
    if (pending.value) return Promise.resolve(false)
    return new Promise<boolean>(resolve => { pending.value = { kind, resolve } })
  }
  function answer(accepted: boolean) {
    const request = pending.value
    pending.value = undefined
    request?.resolve(accepted)
  }
  async function go(id: TabId, mode: 'menu' | 'tab' | 'replace', commit?: () => void) {
    if (pending.value || (busy && mode !== 'replace') || permit) return false
    const base = tabInfo(id).path
    const path = store.clientId.value && isClientWork(id) ? `${base}?clientId=${encodeURIComponent(store.clientId.value)}` : base
    if (router.currentRoute.value.fullPath === path) {
      commit?.()
      return true
    }
    if (mode !== 'menu') permit = { path, commit }
    try {
      const failure = await (mode === 'replace' ? router.replace(path) : router.push(path))
      return !isNavigationFailure(failure) && routeTab(router.currentRoute.value) === id
    } finally {
      if (mode !== 'menu') permit = undefined
    }
  }
  const navigate = (id: TabId, mode: 'menu' | 'tab' = 'menu') => go(id, mode)

  async function requestClose(id: TabId) {
    const tab = store.state.tabs.find(tab => tab.id === id)
    if (id === 'home' || !tab || busy || pending.value) return
    busy = true
    try {
      if (tab.dirty && !await ask('close')) return
      const fallback = closeDestination(store.state, id)
      const commit = () => {
        closeTab(store.state, id, true)
        if (resumeTab.value === id) resumeTab.value = undefined
      }
      if (fallback) await go(fallback, 'replace', commit)
      else commit()
    } finally { busy = false }
  }
  async function requestCompany(id: string) {
    if (!isDemoCompany(id) || id === store.company.value || busy || pending.value) return
    busy = true
    try {
      if ((store.state.tabs.length > 1 || store.hasDirtyTabs.value) && !await ask('company')) return
      const snapshot = preferences.loadCompany(id)
      preferences.persist()
      await go(snapshot.active, 'replace', () => {
        resumeTab.value = undefined
        store.replace(id, snapshot, snapshot.active)
      })
    } finally { busy = false }
  }

  let removeGuard: (() => void) | undefined
  let removeSync: (() => void) | undefined
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!store.hasDirtyTabs.value) return
    event.preventDefault()
    event.returnValue = ''
  }
  onMounted(() => {
    const { company, snapshot } = preferences.restore()
    const id = routeTab(router.currentRoute.value) ?? 'home'
    if (id === 'home' && snapshot.active !== 'home') resumeTab.value = snapshot.active
    const initialClient = router.currentRoute.value.query.clientId
    if (typeof initialClient === 'string' && canUseRoute(router.currentRoute.value)) store.clientId.value = initialClient
    store.replace(company, store.clientId.value ? freshWorkspace() : snapshot, id, true)
    preferences.ready.value = true
    preferences.persist()
    removeGuard = router.beforeEach(async (to, from) => {
      if (!canUseRoute(to)) return false
      const nextClient = to.query.clientId
      if (typeof nextClient === 'string' && nextClient !== store.clientId.value) {
        if (busy || pending.value) return false
        if ((store.state.tabs.length > 1 || store.hasDirtyTabs.value) && !await ask('company')) return false
        return true
      }
      if (to.path === '/login' && !canAccess()) return true
      if (permit?.path === to.fullPath && !permit.accepted) {
        permit.accepted = to
        return true
      }
      if (pending.value || busy) return false
      if (to.path !== from.path && store.activeTab.value.dirty) return ask('navigate')
    })
    removeSync = router.afterEach((to, from, failure) => {
      const id = routeTab(to)
      if (!failure && id) {
        const nextClient = to.query.clientId
        if (typeof nextClient === 'string' && nextClient !== store.clientId.value) {
          store.clientId.value = nextClient
          resumeTab.value = undefined
          store.replace(store.company.value, freshWorkspace(), id)
        }
        if (permit?.accepted === to) permit.commit?.()
        if (to.path !== from.path) resumeTab.value = undefined
        openTab(store.state, id)
        if (!busy) preferences.persist()
      }
    })
  })
  watch(store.hasDirtyTabs, dirty => {
    if (dirty) window.addEventListener('beforeunload', beforeUnload)
    else window.removeEventListener('beforeunload', beforeUnload)
  }, { flush: 'sync' })
  onBeforeUnmount(() => {
    removeGuard?.()
    removeSync?.()
    answer(false)
    window.removeEventListener('beforeunload', beforeUnload)
  })

  return { pending, answer, navigate, requestClose, requestCompany, resumeTab, storageAvailable: preferences.available }
}


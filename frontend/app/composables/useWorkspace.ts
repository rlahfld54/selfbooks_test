import { reactive, ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { closeTab, freshWorkspace, openTab, restoreWorkspace, serializeWorkspace, storageKey, type TabId } from '~/utils/workspace'
export function useWorkspace() {
  const user = 'demo-admin'
  const company = ref('demo-happy')
  const state = reactive(freshWorkspace())
  const collapsed = ref(false)
  const density = ref<'normal' | 'compact'>('normal')
  const ready = ref(false)
  const storageAvailable = ref(true)
  const activeTab = computed(() => state.tabs.find(tab => tab.id === state.active)!)
  const dirty = computed(() => state.tabs.some(tab => tab.dirty))
  const pending = ref<null | { kind: 'close'; id: TabId } | { kind: 'company'; id: string }>(null)
  const key = () => storageKey(user, company.value)
  function read(key: string) { try { return localStorage.getItem(key) } catch { storageAvailable.value = false; return null } }
  function write(key: string, value: string) { try { localStorage.setItem(key, value) } catch { storageAvailable.value = false } }
  function persist() {
    if (!ready.value) return
    write(key(), serializeWorkspace(state))
    write(storageKey(user, 'preferences'), JSON.stringify({ collapsed: collapsed.value, density: density.value }))
  }
  function switchCompany(id: string) {
    if (!['demo-happy', 'demo-woori'].includes(id) || id === company.value) return
    persist()
    company.value = id
    Object.assign(state, restoreWorkspace(read(key())))
    write(storageKey(user, 'last-company'), id)
  }
  function requestCompany(id: string) {
    if (id === company.value) return
    if (dirty.value) pending.value = { kind: 'company', id }
    else switchCompany(id)
  }
  function requestClose(id: TabId) {
    if (id === 'home') return
    if (state.tabs.find(tab => tab.id === id)?.dirty) pending.value = { kind: 'close', id }
    else closeTab(state, id)
  }
  function confirm() {
    const action = pending.value
    pending.value = null
    if (action?.kind === 'close') closeTab(state, action.id, true)
    if (action?.kind === 'company') switchCompany(action.id)
  }
  const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
  onMounted(() => {
    const savedCompany = read(storageKey(user, 'last-company'))
    if (savedCompany === 'demo-woori') company.value = savedCompany
    Object.assign(state, restoreWorkspace(read(key())))
    try {
      const preferences = JSON.parse(read(storageKey(user, 'preferences')) || '{}')
      collapsed.value = typeof preferences.collapsed === 'boolean' ? preferences.collapsed : window.innerWidth < 1024
      density.value = preferences.density === 'compact' ? 'compact' : 'normal'
    } catch { collapsed.value = window.innerWidth < 1024 }
    ready.value = true
    window.addEventListener('beforeunload', beforeUnload)
  })
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
  watch([state, collapsed, density], persist, { deep: true })
  return { state, company, activeTab, collapsed, density, pending, storageAvailable, requestClose, requestCompany, confirm, open: (id: TabId) => openTab(state, id) }
}


import { restoreWorkspace, serializeWorkspace, storageKey } from '~/utils/workspace'
import { isDemoCompany, type WorkspaceStore } from '~/features/workspace/stores/workspace'
import type { TabId } from '~/utils/workspace-routes'

export function useWorkspacePreferences(store: WorkspaceStore, resume: () => TabId | undefined) {
  const available = ref(true)
  const ready = ref(false)
  const key = (scope: string) => storageKey(store.user, scope)

  function read(scope: string) {
    try { return localStorage.getItem(key(scope)) }
    catch { available.value = false; return null }
  }
  function write(scope: string, value: string) {
    try { localStorage.setItem(key(scope), value) }
    catch { available.value = false }
  }
  function loadCompany(id: string) {
    return restoreWorkspace(read(id))
  }
  function persist() {
    if (!ready.value) return
    write(store.company.value, snapshot())
    write('last-company', store.company.value)
    write('preferences', JSON.stringify({ collapsed: store.collapsed.value, density: store.density.value }))
  }
  function restore() {
    const savedCompany = read('last-company')
    const company = isDemoCompany(savedCompany) ? savedCompany : store.company.value
    store.collapsed.value = window.innerWidth < 1024
    try {
      const prefs = JSON.parse(read('preferences') ?? '{}')
      if (typeof prefs?.collapsed === 'boolean') store.collapsed.value = prefs.collapsed
      if (prefs?.density === 'compact') store.density.value = 'compact'
    } catch { /* Use responsive defaults. */ }
    return { company, snapshot: loadCompany(company) }
  }

  function snapshot() {
    return serializeWorkspace({ tabs: store.state.tabs, active: resume() ?? store.state.active })
  }
  watch(() => [store.company.value, snapshot(), store.collapsed.value, store.density.value], persist)
  return { available, ready, loadCompany, restore, persist }
}


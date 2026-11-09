import { computed, reactive, ref } from 'vue'
import { openTab, freshWorkspace } from '../../../utils/workspace.ts'
import type { Density, WorkTab, Workspace } from '../../../types/workspace'
import type { TabId } from '../../../utils/workspace-routes'

export const companies = [
  { value: 'demo-happy', label: '(주)행복상사 · 데모' },
  { value: 'demo-woori', label: '(주)우리상사 · 데모' },
]
export const isDemoCompany = (id: unknown): id is string => companies.some(company => company.value === id)

// One store per layout instance; never shared between SSR requests.
export function createWorkspaceStore(initialTab: TabId) {
  const user = 'demo-admin'
  const company = ref(companies[0]!.value)
  const generation = ref(0)
  const state = reactive(freshWorkspace())
  openTab(state, initialTab)
  const collapsed = ref(false)
  const density = ref<Density>('normal')
  const activeTab = computed(() => state.tabs.find(tab => tab.id === state.active)!)
  const hasDirtyTabs = computed(() => state.tabs.some(tab => tab.dirty))

  function replace(nextCompany: string, snapshot: Workspace, id: TabId, initial = false) {
    const current = initial && nextCompany === company.value && activeTab.value.id === id
      ? activeTab.value
      : undefined
    openTab(snapshot, id)
    if (current) {
      const index = snapshot.tabs.findIndex(tab => tab.id === id)
      current.panelWidth = snapshot.tabs[index]!.panelWidth
      snapshot.tabs[index] = current
    }
    company.value = nextCompany
    Object.assign(state, snapshot)
    if (!current) generation.value++
  }

  function setDirty(tab: WorkTab, dirty = true) {
    tab.dirty = dirty
  }

  return { user, company, generation, state, collapsed, density, activeTab, hasDirtyTabs, replace, setDirty }
}
export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>


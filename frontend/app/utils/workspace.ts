import { menu, type TabId } from './workspace-routes.ts'
import type { Workspace, WorkTab } from '../types/workspace'

export const createTab = (id: TabId): WorkTab => ({ id, dirty: false, panel: false, panelWidth: 360 })
export const freshWorkspace = (): Workspace => ({ tabs: [createTab('home')], active: 'home' })

export function openTab(state: Workspace, id: TabId) {
  if (!menu.some(item => item.id === id)) return
  if (!state.tabs.some(tab => tab.id === id)) state.tabs.push(createTab(id))
  state.active = id
}

export function closeDestination(state: Workspace, id: TabId): TabId | undefined {
  if (id === 'home' || state.active !== id) return
  const index = state.tabs.findIndex(tab => tab.id === id)
  return state.tabs[index - 1]?.id
}

export function closeTab(state: Workspace, id: TabId, discard = false) {
  const index = state.tabs.findIndex(tab => tab.id === id)
  if (id === 'home' || index < 0) return false
  if (state.tabs[index]!.dirty && !discard) return false
  const destination = closeDestination(state, id)
  state.tabs.splice(index, 1)
  if (destination) state.active = destination
  return true
}

export function serializeWorkspace(state: Workspace) {
  return JSON.stringify({ version: 1, tabs: state.tabs.map(({ id, panelWidth }) => ({ id, panelWidth })), active: state.active })
}

export function restoreWorkspace(raw: string | null): Workspace {
  const state = freshWorkspace()
  if (!raw) return state
  try {
    const saved = JSON.parse(raw) as { version?: unknown; tabs?: unknown; active?: unknown } | null
    if (saved?.version !== 1 || !Array.isArray(saved.tabs)) return state
    for (const entry of saved.tabs as ({ id?: unknown; panelWidth?: unknown } | null)[]) {
      const item = menu.find(item => item.id === entry?.id)
      if (!item) continue
      openTab(state, item.id)
      const tab = state.tabs.find(tab => tab.id === item.id)!
      const width = entry?.panelWidth
      tab.panelWidth = typeof width === 'number' && Number.isFinite(width) ? Math.min(480, Math.max(320, width)) : 360
    }
    state.active = state.tabs.find(tab => tab.id === saved.active)?.id ?? 'home'
  } catch { /* Ignore corrupt or outdated storage. */ }
  return state
}

export const storageKey = (user: string, scope: string) =>
  'accounting-pro:v1:' + encodeURIComponent(user) + ':' + encodeURIComponent(scope)


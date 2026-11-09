import { provide } from 'vue'
import { workspaceKey } from '~/composables/useWorkspaceContext'
import { createWorkspaceStore } from '../stores/workspace'
import { useWorkspaceNavigation } from './useWorkspaceNavigation'

// Called once by the layout: each layout/SSR request owns its workspace.
export function useWorkspaceProvider() {
  const store = createWorkspaceStore(useRoute().meta.workspaceTab ?? 'home')
  const navigation = useWorkspaceNavigation(store)
  const workspace = { ...store, ...navigation }
  provide(workspaceKey, workspace)
  return workspace
}

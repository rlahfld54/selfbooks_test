import { provide } from 'vue'
import { workspaceKey } from '~/composables/useWorkspaceContext'
import { createWorkspaceStore } from '../stores/workspace'
import { useWorkspaceNavigation } from './useWorkspaceNavigation'
import { useAuth } from '~/features/auth/useAuth'

// Called once by the layout: each layout/SSR request owns its workspace.
export function useWorkspaceProvider() {
  const { user } = useAuth()
  const store = createWorkspaceStore(useRoute().meta.workspaceTab ?? 'home', user.value?.id ?? 'demo-admin')
  const navigation = useWorkspaceNavigation(store)
  const workspace = { ...store, ...navigation }
  provide(workspaceKey, workspace)
  return workspace
}

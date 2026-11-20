import { provide } from 'vue'
import { workspaceKey } from '~/composables/useWorkspaceContext'
import { createWorkspaceStore } from '../stores/workspace'
import { useWorkspaceNavigation } from './useWorkspaceNavigation'
import { managementSession } from '~/features/management/session'
import { useManagedDirectory } from '~/features/management/useManagedDirectory'
import { canOpenClient } from '~/features/management/assignments'
import { isClientWork } from '~/features/management/client-work'
import type { RouteLocationNormalized } from 'vue-router'
import { useAuth } from '~/features/auth/useAuth'

// Called once by the layout: each layout/SSR request owns its workspace.
export function useWorkspaceProvider() {
  const { user } = useAuth()
  const { pagesPreview } = useRuntimeConfig().public
  const store = createWorkspaceStore(useRoute().meta.workspaceTab ?? 'home', user.value?.id ?? 'demo-admin')
  const data = managementSession(store.state)
  const directory = useManagedDirectory()
  const initialClient = useRoute().query.clientId
  if (typeof initialClient === 'string') store.clientId.value = initialClient
  const identity = () => user.value ?? (pagesPreview ? { ...data.staff[0]!, role: 'OWNER' } : null)
  // TODO: Server must enforce staff membership and client authorization on every API request.
  // UI gating does not change the backend company scope.
  function canUseRoute(route: RouteLocationNormalized) {
    const scoped = isClientWork(route.meta.workspaceTab)
    const id = route.query.clientId ?? (scoped ? store.clientId.value : '')
    if (id && data.directory.status !== 'success') return false
    if (id && (typeof id !== 'string' || !canOpenClient(data.clients.find(row => row.id === id), identity()))) return false
    if (route.meta.workspaceTab === 'client-work' && !id) return false
    if (scoped && identity()?.role === 'STAFF' && !id) return false
    return true
  }
  const navigation = useWorkspaceNavigation(store, () => pagesPreview || Boolean(user.value), canUseRoute)
  const route = useRoute()
  const routeAllowed = computed(() => canUseRoute(route))
  const workspace = { ...store, ...navigation, ...directory, routeAllowed }
  provide(workspaceKey, workspace)
  return workspace
}

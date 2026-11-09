import type { InjectionKey } from 'vue'
import type { createWorkspaceStore } from '~/features/workspace/stores/workspace'
import type { useWorkspaceNavigation } from '~/features/workspace/composables/useWorkspaceNavigation'

type WorkspaceContext = ReturnType<typeof createWorkspaceStore> & ReturnType<typeof useWorkspaceNavigation>
export const workspaceKey: InjectionKey<WorkspaceContext> = Symbol('workspace')

export function useWorkspaceContext() {
  const workspace = inject(workspaceKey)
  if (!workspace) throw new Error('Workspace layout is required.')
  return workspace
}


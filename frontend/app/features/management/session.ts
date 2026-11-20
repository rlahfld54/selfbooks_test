import { reactive } from 'vue'
import { useClientStore } from '../../stores/clientStore'
import type { Client } from './data'
import type { Workspace } from '~/types/workspace'
import { useOrganizationStore, createOrganizationState } from '../../stores/organizationStore'
import { useStaffStore, createStaffState } from '../../stores/staffStore'
import { useBranchStore, createBranchState } from '../../stores/branchStore'

export function createManagementData() {
  return {
    staff: createStaffState(),
    clients: [] as Client[],
    directory: { status: 'idle' as 'idle' | 'pending' | 'success' | 'error', error: '' },
    organization: createOrganizationState(),
    branches: createBranchState(),
  }
}
const sessions = new WeakMap<Workspace, ReturnType<typeof createManagementData>>()
export function managementSession(workspace: Workspace) {
  const clientStore = useClientStore()
  const organization = useOrganizationStore().forScope(workspace)
  const staff = useStaffStore().forScope(workspace)
  const branches = useBranchStore().forScope(workspace)
  let session = sessions.get(workspace)
  if (!session) {
    session = reactive({
      organization, staff, branches,
      get clients() { return clientStore.clients },
      get directory() {
        return {
          status: clientStore.state.loading ? 'pending' as const
            : clientStore.state.error ? 'error' as const
            : clientStore.loaded ? 'success' as const : 'idle' as const,
          error: clientStore.state.error,
        }
      },
    })
    sessions.set(workspace, session)
  }
  return session
}

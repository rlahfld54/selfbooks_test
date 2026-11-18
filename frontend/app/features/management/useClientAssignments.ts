import { computed, watch } from 'vue'
import { useAuth } from '~/features/auth/useAuth'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { managementSession } from './session'
import { assignmentRole, assignmentSummary, canManageClients, canOpenClient, type DirectoryUser } from './assignments'

export function useClientAssignments() {
  const workspace = useWorkspaceContext()
  const data = managementSession(workspace.state)
  const { user: authenticated, verifying } = useAuth()
  const { public: { pagesPreview } } = useRuntimeConfig()
  const user = computed<DirectoryUser | null>(() => authenticated.value ?? (pagesPreview
    ? {
        id: data.staff[0]!.id, name: data.staff[0]!.name, email: data.staff[0]!.email, role: 'OWNER',
      }
    : null))
  // Existing API has no staff directory. Add only the authenticated identity to the mock picker.
  // Never infer a user's assignments from their display name/email or grant them sample clients.
  watch(user, (person) => {
    if (person && !data.staff.some(row => row.id === person.id)) {
      data.staff.push({
        ...person, login: '', team: '현재 로그인 사용자', title: '', status: '활성', joined: '',
      })
    }
  }, { immediate: true })
  const loading = computed(() => verifying.value || ['idle', 'pending'].includes(data.directory.status))
  const error = computed(() => data.directory.error)
  const admin = computed(() => canManageClients(user.value?.role))
  const mine = computed(() => data.clients.filter(client => assignmentRole(client, user.value?.id ?? '')))
  const summary = computed(() => assignmentSummary(data.clients, user.value?.id ?? ''))
  const accessible = computed(() => data.clients.filter(client => canOpenClient(client, user.value)))
  return { data, user, admin, mine, summary, accessible, loading, error, reload: workspace.reloadDirectory }
}

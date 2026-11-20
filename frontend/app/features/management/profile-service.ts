import type { AuthUser, AuthOrganization } from '../auth/user'
import type { createApiClient } from '../../services/api-client'

export type ProfileUser = AuthUser
export type ProfileOffice = AuthOrganization
export function createProfileService(request: ReturnType<typeof createApiClient>) {
  return {
    async load(signal?: AbortSignal) {
      const [user, office] = await Promise.all([
        request<ProfileUser>('/auth/me', signal),
        request<ProfileOffice>('/office-registration', signal),
      ])
      if (user.data.officeId !== office.data.id) throw new Error('사용자와 소속 조직 정보를 확인해 주세요.')
      return { user: user.data, office: office.data }
    },
  }
}
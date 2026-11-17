import type { createApiClient } from '../../services/api-client'

export interface ProfileUser { id: string; name: string; email: string; officeId: string; role: string; userCode?: string | null; loginId?: string | null; phone?: string | null; departmentName?: string | null; jobTitle?: string | null; joinedAt?: string | null }
export interface ProfileOffice {
  id: string; name: string
  business_registration_number: string | null
  representative_name: string | null
  representative_phone: string | null
  address: string | null
}
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
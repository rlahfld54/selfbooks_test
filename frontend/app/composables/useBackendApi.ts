import { createApiClient } from '~/services/api-client'
import { useAuth } from '~/features/auth/useAuth'

export function useBackendApi() {
  const { public: { apiBase } } = useRuntimeConfig()
  const auth = useAuth()
  return createApiClient(async (path, options) => $fetch(path, { ...options, headers: await auth.headers() }), apiBase)
}

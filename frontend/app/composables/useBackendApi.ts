import { createApiClient } from '~/services/api-client'

export function useBackendApi() {
  const { public: { apiBase } } = useRuntimeConfig()
  return createApiClient($fetch, apiBase)
}

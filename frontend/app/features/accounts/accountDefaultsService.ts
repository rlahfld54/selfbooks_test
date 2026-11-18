import type { ClientSummaryResponse } from './clientSummaries'
import type { createApiClient } from '~/services/api-client'
import type { AccountDefaultRecord } from './accountDefaults'
export function createAccountDefaultsService(request: ReturnType<typeof createApiClient>) {
  return { summaries: (signal?: AbortSignal) => request<ClientSummaryResponse>('/account-summaries', { signal }), list: (signal?: AbortSignal) => request<AccountDefaultRecord[]>('/account-defaults', { signal }) }
}


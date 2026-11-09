import type { createApiClient } from '../../../services/api-client'
import type { ClientRecord } from '../types/client'

export function createClientDirectoryService(request: ReturnType<typeof createApiClient>) {
  return {
    list: (signal?: AbortSignal) => request<ClientRecord[]>('/clients', signal),
    get: (id: string, signal?: AbortSignal) => request<ClientRecord>('/clients/' + encodeURIComponent(id), signal),
  }
}


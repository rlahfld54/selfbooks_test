import type { createApiClient } from '../../../services/api-client'
import type { ClientRecord } from '../types/client'

export function createClientDirectoryService(request: ReturnType<typeof createApiClient>) {
  return {
    list: (signal?: AbortSignal) => request<ClientRecord[]>('/clients', signal),
    get: (id: string, signal?: AbortSignal) => request<ClientRecord>('/clients/' + encodeURIComponent(id), signal),
  }
}

const sampleClients: ClientRecord[] = [
  { id: 'preview-1', officeId: 'preview-office', name: '샘플 문구점', taxpayerKind: '개인', status: 'active' },
  { id: 'preview-2', officeId: 'preview-office', name: '샘플 디자인', taxpayerKind: '법인', status: 'active' },
]

export const previewClientDirectory = {
  async list(signal?: AbortSignal) {
    signal?.throwIfAborted()
    return { data: sampleClients.map(client => ({ ...client })) }
  },
  async get(id: string, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const client = sampleClients.find(row => row.id === id)
    return { data: client ? { ...client } : null }
  },
}


import type { createApiClient } from '../../../services/api-client.ts'
import type { CollectedRow, CollectionHistoryItem, CollectionRun, CollectionStatus, RowsQuery, StartRunInput } from '../types.ts'

export type CollectionService = ReturnType<typeof createCollectionService>

const query = (params: Record<string, string>) => '?' + new URLSearchParams(params).toString()

// Fastify `/api/collection/*` — 회사 범위와 홈택스 자격은 서버가 확인한다.
export function createCollectionService(request: ReturnType<typeof createApiClient>) {
  return {
    status: (signal?: AbortSignal) => request<CollectionStatus>('/collection/status', { signal }),
    start: (input: StartRunInput) =>
      request<CollectionRun>('/collection/runs', { method: 'POST', body: { ...input, clientIds: [...input.clientIds], kinds: [...input.kinds] } }),
    run: (id: string, signal?: AbortSignal) => request<CollectionRun>('/collection/runs/' + encodeURIComponent(id), { signal }),
    retry: (runId: string, itemId: string) =>
      request<CollectionRun>(
        '/collection/runs/' + encodeURIComponent(runId) + '/items/' + encodeURIComponent(itemId) + '/retry',
        { method: 'POST', body: {} },
      ),
    /** 아직 시작하지 않은 작업을 멈춘다 — 도는 중인 종류는 끝까지 받는다 */
    cancel: (runId: string) =>
      request<CollectionRun>('/collection/runs/' + encodeURIComponent(runId) + '/cancel', { method: 'POST', body: {} }),
    history: (clientId: string, signal?: AbortSignal) =>
      request<CollectionHistoryItem[]>('/collection/history' + query({ clientId }), { signal }),
    rows: (input: RowsQuery, signal?: AbortSignal) =>
      request<CollectedRow[]>('/collection/rows' + query({ clientId: input.clientId, from: input.from, to: input.to }), { signal }),
  }
}

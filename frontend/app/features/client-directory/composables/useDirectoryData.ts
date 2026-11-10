import type { ApiResponse } from '~/services/api-client'
import { createClientDirectoryService, previewClientDirectory } from '../services/clientDirectory'
import type { ClientRecord } from '../types/client'

export function useDirectoryData(scope: string, selectedId: () => string) {
  // Resolve Nuxt runtime config synchronously in setup; services stay context-free.
  const service = useRuntimeConfig().public.pagesPreview
    ? previewClientDirectory
    : createClientDirectoryService(useBackendApi())
  const key = 'client-directory:' + scope
  // Refetch on entry; the demo company is a cache namespace, never an authorization scope.
  const options = { server: false, getCachedData: () => undefined } as const
  const list = useAsyncData(key, (_nuxt, { signal }) => service.list(signal), options)
  const detail = useAsyncData<ApiResponse<ClientRecord | null>>(
    computed(() => key + ':detail:' + selectedId()),
    (_nuxt, { signal }) => {
      const id = selectedId()
      return id ? service.get(id, signal) : Promise.resolve({ data: null })
    },
    options,
  )
  onBeforeUnmount(() => { list.clear(); detail.clear() })
  return { list, detail }
}


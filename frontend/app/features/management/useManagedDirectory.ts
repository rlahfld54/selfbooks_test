import { onMounted, onBeforeUnmount } from 'vue'
import { useBackendApi } from '~/composables/useBackendApi'
import { createClientDirectoryService } from '../client-directory/services/clientDirectory'
import { mapDirectoryClients } from './directory-mapping'
import type { createManagementData } from './session'

// One loader per workspace, shared by directory, dashboard and client work routes.
export function useManagedDirectory(data: ReturnType<typeof createManagementData>) {
  const service = createClientDirectoryService(useBackendApi())
  let controller: AbortController | undefined
  async function reloadDirectory() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    data.directory.status = 'pending'
    data.directory.error = ''
    try {
      const result = await service.list(current.signal)
      // 브라우저 개발자도구 Console에 출력
      console.log('수임업체 API 응답:', result)
      // console.table(result.data)
      if (current.signal.aborted) {
        return
      }
      data.clients = mapDirectoryClients(result.data, data.clients)
      data.directory.status = 'success'
    } catch (error) {
      if (current.signal.aborted) {
        return
      }
      data.directory.status = 'error'
      data.directory.error =
        error instanceof Error ? error.message : '수임업체를 불러오지 못했습니다.'
    }
  }
  onMounted(() => {
    void reloadDirectory()
  })
  onBeforeUnmount(() => controller?.abort())
  return { reloadDirectory }
}

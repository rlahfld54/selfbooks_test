import { onMounted } from 'vue'
import { useClientStore } from '~/stores/clientStore'

// 목록·로딩·오류·캐시는 clientStore 한 곳에서 관리한다.
export function useManagedDirectory() {
  const clientStore = useClientStore()
  onMounted(() => { void clientStore.fetchClients() })
  return { reloadDirectory: () => clientStore.refresh() }
}

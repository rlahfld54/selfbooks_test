import { defineStore } from 'pinia'
import { useCollectionService } from '~/features/collection/composables/useCollection'
import type { CollectionCompany, SaveAccountInput } from '~/features/collection/types'

//수임업체 목록
export const useClientStore = defineStore('clientStore', () => {
  const service = useCollectionService()

  const companies = ref<CollectionCompany[]>([])
  const sample = ref(false)
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')

  //이미 불러왔으면 다시 부르지 않는다. force 면 새로 부른다
  async function fetchClients(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return

    loading.value = true
    error.value = ''
    try {
      const { data } = await service.status()
      companies.value = data.companies
      sample.value = data.sample
      loaded.value = true
      printClients()
    }
    catch (e) {
      error.value = (e as Error).message || '수임업체를 불러오지 못했습니다.'
    }
    finally {
      loading.value = false
    }
  }

  function refresh() {
    return fetchClients(true)
  }

  async function saveHometaxAccount(clientId: string, input: SaveAccountInput) {
    await service.saveAccount(clientId, input)
    await refresh()
  }

  function clear() {
    companies.value = []
    loaded.value = false
    error.value = ''
  }

  //개발 모드에서만 콘솔에 출력 (비밀번호는 store 에 없다)
  function printClients() {
    if (!import.meta.dev || !import.meta.client) return

    const rows = companies.value.map(company => ({
      업체: company.name,
      사업자번호: company.bizNo,
      담당: company.manager || '미지정',
      홈택스: company.hometaxReady ? '등록됨' : '미등록',
      수집완료: Object.values(company.cells).filter(cell => cell.status === 'done').length + '/9',
    }))

    console.log(`[clientStore] 수임업체 ${rows.length}곳`)
    console.table(rows)
  }

  return {
    companies,
    sample,
    loaded,
    loading,
    error,
    fetchClients,
    refresh,
    saveHometaxAccount,
    clear,
  }
})

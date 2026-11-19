import { defineStore } from 'pinia'
import { useCollectionService } from '~/features/collection/composables/useCollection'
import type { CollectionCompany, SaveAccountInput } from '~/features/collection/types'

/*
 * 수임업체 목록 — 전역 한 곳에서 관리한다.
 * 데이터: GET /api/collection/status (공용 DB clients + 업체별 홈택스 계정 등록 여부 + 종류별 마지막 수집 상태).
 * 미리보기(NUXT_PUBLIC_PAGES_PREVIEW)에서는 샘플 업체를 쓴다.
 *
 * - companies       업체 목록 (홈택스 계정 · 수집 칸 포함, 비밀번호는 없다)
 * - loading / error  불러오는 중 · 실패 문구
 * - fetchClients()   처음 한 번 부르고, 60초 안에는 캐시를 쓴다. force 면 다시 부른다. 동시에 부르면 한 번만 요청
 * - refresh()        수집이 끝났을 때 · 새로고침 버튼
 * - saveHometaxAccount() 홈택스 계정 저장 후 목록 갱신
 */
const STALE_MS = 60_000

export const useClientStore = defineStore('clientStore', () => {
  const service = useCollectionService()

  const companies = ref<CollectionCompany[]>([])
  const sample = ref(false)
  const loading = ref(false)
  const error = ref('')
  const loadedAt = ref<number | null>(null)
  let inflight: Promise<void> | null = null

  const loaded = computed(() => loadedAt.value !== null)
  const byId = computed(() => new Map(companies.value.map(company => [company.clientId, company])))
  const hometaxReadyCount = computed(() => companies.value.filter(company => company.hometaxReady).length)

  function fetchClients(options: { force?: boolean } = {}) {
    if (inflight) { return inflight }
    if (!options.force && loadedAt.value !== null && Date.now() - loadedAt.value < STALE_MS) { return Promise.resolve() }
    loading.value = true
    error.value = ''
    inflight = service.status()
      .then(({ data }) => {
        companies.value = data.companies
        sample.value = data.sample
        loadedAt.value = Date.now()
        logLoaded()
      })
      .catch((failure: Error) => {
        error.value = failure.message || '수임업체를 불러오지 못했습니다.'
      })
      .finally(() => {
        loading.value = false
        inflight = null
      })
    return inflight
  }

  /**
   * 개발 모드에서만 콘솔에 store 내용을 찍는다(운영 빌드에는 안 들어간다).
   * 비밀번호는 store 에 원래 없고, 업체명 · 사업자번호 · 홈택스 등록 여부 · 수집 상태만 보인다.
   * 브라우저 콘솔에서 직접 보려면: useNuxtApp().$pinia.state.value.clientStore
   */
  function logLoaded() {
    if (!import.meta.dev || !import.meta.client) { return }
    const done = (company: CollectionCompany) => Object.values(company.cells).filter(cell => cell.status === 'done').length
    console.groupCollapsed(`[clientStore] 수임업체 ${companies.value.length}곳 · 홈택스 계정 ${hometaxReadyCount.value}곳 · ${sample.value ? '샘플' : 'DB'} · ${new Date(loadedAt.value!).toLocaleTimeString()}`)
    // 홈택스 계정이 있고 수집이 많이 된 업체를 위로
    const ordered = [...companies.value].sort((a, b) => Number(b.hometaxReady) - Number(a.hometaxReady) || done(b) - done(a))
    console.table(ordered.slice(0, 50).map(company => ({
      업체: company.name, 사업자번호: company.bizNo, 담당: company.manager || '미지정',
      홈택스: company.hometaxReady ? '등록됨' : '미등록', '수집 완료': `${done(company)}/9`,
    })))
    if (companies.value.length > 50) { console.log(`… 외 ${companies.value.length - 50}곳 (전체: useNuxtApp().$pinia.state.value.clientStore.companies)`) }
    console.groupEnd()
  }

  const refresh = () => fetchClients({ force: true })
  const findClient = (clientId: string) => byId.value.get(clientId) ?? null

  async function saveHometaxAccount(clientId: string, input: SaveAccountInput) {
    const { data } = await service.saveAccount(clientId, input)
    const company = byId.value.get(clientId)
    if (company) { Object.assign(company, { hometaxId: data.hometaxId, hometaxReady: data.hometaxReady }) }
    await refresh()
  }

  function clear() {
    companies.value = []
    loadedAt.value = null
    error.value = ''
  }

  return { companies, sample, loading, error, loaded, loadedAt, hometaxReadyCount, fetchClients, refresh, findClient, saveHometaxAccount, clear }
})

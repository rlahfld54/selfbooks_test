import { defineStore } from 'pinia'
import { computed, reactive, watch } from 'vue'
import { useAuthStore } from './authStore'
import { mapDirectoryClients } from '~/features/management/directory-mapping'
import type { Client } from '~/features/management/data'
import { clients as previewClients } from '~/features/management/data'
import type { ClientRecord, AssignedClient } from '~/features/clients/types'
import { useCollectionService } from '~/features/collection/composables/useCollection'
import type { CollectionCompany, SaveAccountInput } from '~/features/collection/types'

// 설정값
const CONFIG = {
  cache: {
    staleMs: 60_000,
  },
  debug: {
    maxRows: 50,
  },
} as const

interface ClientState {
  clients: ClientRecord[]
  assignedClients: AssignedClient[]
  companies: CollectionCompany[]
  sample: boolean
  loading: boolean
  error: string
  loadedAt: number | null
}

const createInitialState = (): ClientState => ({
  clients: [],
  assignedClients: [],
  companies: [],
  sample: false,
  loading: false,
  error: '',
  loadedAt: null,
})

export const useClientStore = defineStore('clientStore', () => {
  const service = useCollectionService()
  const authStore = useAuthStore()
  let revision = 0

  // 1. 상태
  const state = reactive<ClientState>(createInitialState())

  // 중복 API 요청 방지
  let inflight: Promise<void> | null = null

  // 2. 조회 데이터
  const clients = computed<Client[]>((previous) => {
    if (state.sample) return reactive(previewClients.map(client => ({ ...client, secondary: [...client.secondary] })))
    return reactive(mapDirectoryClients(state.clients.map(client => ({
      ...client,
      officeId: client.office_id,
      name: client.client_name,
      taxpayerKind: client.taxpayer_kind,
    })), previous).map(client => ({
      ...client,
      secondaryIds: state.assignedClients.some(row => row.client.id === client.id && row.assignment.assignment_role === 'SECONDARY')
        ? [authStore.user?.id ?? ''] : client.secondaryIds ?? [],
      secondary: state.assignedClients.some(row => row.client.id === client.id && row.assignment.assignment_role === 'SECONDARY')
        ? [authStore.user?.name ?? ''] : client.secondary,
    })))
  })
  const assignedClients = computed(() => state.assignedClients)
  const loaded = computed(() => state.loadedAt !== null)

  const byId = computed(
    () => new Map(state.companies.map((company) => [company.clientId, company])),
  )

  const hometaxReadyCount = computed(
    () => state.companies.filter((company) => company.hometaxReady).length,
  )

  const isCacheValid = computed(
    () => state.loadedAt !== null && Date.now() - state.loadedAt < CONFIG.cache.staleMs,
  )

  // 3. API 조회
  function fetchClients(options: { force?: boolean } = {}) {
    if (inflight) return inflight

    if (!options.force && isCacheValid.value) {
      return Promise.resolve()
    }

    const started = revision
    state.loading = true
    state.error = ''

    inflight = service
      .status()
      .then(({ data }) => {
        if (started !== revision) return
        state.clients = data.clients ?? []
        state.assignedClients = data.assignedClients ?? []
        state.companies = data.companies
        state.sample = data.sample
        state.loadedAt = Date.now()

        logLoaded()
      })
      .catch((failure: unknown) => {
        if (started !== revision) return
        state.error = failure instanceof Error ? failure.message : '수임업체를 불러오지 못했습니다.'
      })
      .finally(() => {
        if (started !== revision) return
        state.loading = false
        inflight = null
      })

    return inflight
  }

  // 4. 업체 조회
  function findClient(clientId: string) {
    return byId.value.get(clientId) ?? null
  }

  // 5. 새로고침
  function refresh() {
    return fetchClients({ force: true })
  }

  // 6. 홈택스 계정 저장
  async function saveHometaxAccount(clientId: string, input: SaveAccountInput) {
    const started = revision
    const { data } = await service.saveAccount(clientId, input)
    if (started !== revision) return

    const company = findClient(clientId)

    if (company) {
      Object.assign(company, {
        hometaxId: data.hometaxId,
        hometaxReady: data.hometaxReady,
      })
    }

    await refresh()
  }

  // 7. 초기화
  function clear() {
    // computed의 이전 목록에도 사용자별 임시 담당자 정보가 남지 않게 한다.
    clients.value.splice(0)
    revision++
    inflight = null
    Object.assign(state, createInitialState())
  }

  // 로그아웃·사용자/조직 변경 시 이전 캐시 및 진행 중 응답을 무효화한다.
  watch(
    () => [authStore.user?.id, authStore.user?.officeId],
    ([id, officeId], [previousId, previousOfficeId]) => {
      if (id !== previousId || officeId !== previousOfficeId) clear()
    },
    { flush: 'sync' },
  )

  // 8. 개발용 로그
  function logLoaded() {
    if (!import.meta.dev || !import.meta.client) return

    const doneCount = (company: CollectionCompany) =>
      Object.values(company.cells).filter((cell) => cell.status === 'done').length

    const ordered = [...state.companies].sort(
      (a, b) => Number(b.hometaxReady) - Number(a.hometaxReady) || doneCount(b) - doneCount(a),
    )

    console.groupCollapsed(`[clientStore] 수임업체 ${state.companies.length}곳`)

    console.table(
      ordered.slice(0, CONFIG.debug.maxRows).map((company) => ({
        업체: company.name,
        사업자번호: company.bizNo,
        담당: company.manager || '미지정',
        홈택스: company.hometaxReady ? '등록됨' : '미등록',
        '수집 완료': doneCount(company),
      })),
    )

    console.log('clients:', JSON.parse(JSON.stringify(state.clients)))
    console.log('assignedClients:', JSON.parse(JSON.stringify(state.assignedClients)))
    console.groupEnd()
  }

  return {
    state,

    // Getters
    clients,
    assignedClients,
    loaded,
    byId,
    hometaxReadyCount,
    isCacheValid,

    // Actions
    fetchClients,
    findClient,
    refresh,
    saveHometaxAccount,
    clear,
  }
})

import type { CollectedRow, CollectionHistoryItem, CollectionRun, CollectionRunItem, CollectionStatus, SaveAccountInput, StartRunInput } from '../types'
import type { ApiResponse } from '~/services/api-client'
import { createCollectionService } from '../services/collection'
import { createPreviewCollectionService } from '../services/previewCollection'
import { overlayRun, runFinished } from '../logic'
import type { collectionSession } from './useCollectionSession'

interface Service {
  status: (signal?: AbortSignal) => Promise<ApiResponse<CollectionStatus>>
  start: (input: StartRunInput) => Promise<ApiResponse<CollectionRun>>
  run: (id: string, signal?: AbortSignal) => Promise<ApiResponse<CollectionRun>>
  retry: (runId: string, itemId: string) => Promise<ApiResponse<CollectionRun>>
  cancel: (runId: string) => Promise<ApiResponse<CollectionRun>>
  saveAccount: (clientId: string, input: SaveAccountInput) => Promise<ApiResponse<{ clientId: string, hometaxId: string, hometaxReady: boolean }>>
  history: (clientId: string, signal?: AbortSignal) => Promise<ApiResponse<CollectionHistoryItem[]>>
  rows: (input: { clientId: string, from: string, to: string }, signal?: AbortSignal) => Promise<ApiResponse<CollectedRow[]>>
}

// 미리보기는 브라우저 안에서만 돈다. 탭을 오가도 같은 샘플 진행 상태를 보이도록 하나만 만든다.
let preview: Service | null = null
const previewService = () => (preview ??= createPreviewCollectionService())

type Session = ReturnType<typeof collectionSession>

// 미리보기면 샘플, 아니면 Fastify
export function useCollectionService(timeout = 20000): Service {
  // runtimeConfig 는 setup 에서 바로 읽는다. 서비스는 Nuxt 전역에 기대지 않는다.
  const sample = useRuntimeConfig().public.pagesPreview
  return sample ? previewService() : createCollectionService(useBackendApi(timeout))
}

// 업체 목록은 clientStore, 여기서는 수집 작업만 다룬다
export function useCollection(session: Session) {
  const sample = useRuntimeConfig().public.pagesPreview
  const api = useCollectionService()
  const service = (): Service => api
  const pollMs = sample ? 600 : 1500
  const clients = useClientStore()
  void clients.fetchClients()

  const run = ref<CollectionRun | null>(null)
  const actionError = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined
  let alive = true

  const stopPolling = () => { clearTimeout(timer); timer = undefined }
  async function poll() {
    stopPolling()
    if (!alive || !session.runId) { return }
    try {
      const { data } = await service().run(session.runId)
      if (!alive) { return }
      run.value = data
      if (runFinished(data)) {
        await clients.refresh()
        return
      }
    }
    catch (error) {
      actionError.value = (error as Error).message
    }
    if (alive) { timer = setTimeout(poll, pollMs) }
  }

  async function start(input: StartRunInput) {
    actionError.value = ''
    const { data } = await service().start(input)
    run.value = data
    Object.assign(session, { runId: data.id, dockOpen: true, dockMinimized: false, hidden: [] })
    void poll()
  }

  async function retry(item: CollectionRunItem) {
    if (!session.runId) { return }
    actionError.value = ''
    try {
      const { data } = await service().retry(session.runId, item.id)
      run.value = data
      void poll()
    }
    catch (error) {
      actionError.value = (error as Error).message
    }
  }

  /** 중단 — 대기 중인 작업만 멈춘다. 도는 중인 종류는 끝까지 받는다(홈택스 세션을 중간에 끊지 않는다) */
  async function cancel() {
    if (!session.runId) { return }
    actionError.value = ''
    try {
      const { data } = await service().cancel(session.runId)
      run.value = data
      void poll()
    }
    catch (error) {
      actionError.value = (error as Error).message
    }
  }

  /** 업체 홈택스 계정 저장 — 전역 목록에 바로 반영해 「계정 미등록」을 지운다 */
  const saveAccount = (clientId: string, input: SaveAccountInput) => clients.saveHometaxAccount(clientId, input)

  // 화면에 다시 들어오면 진행 중이던 작업을 이어서 본다
  onMounted(() => { if (session.runId) { void poll() } })
  // 목록은 전역이라 화면을 떠나도 지우지 않는다(다른 화면 · 다시 들어올 때 캐시로 바로 보인다)
  onBeforeUnmount(() => { alive = false; stopPolling() })

  const companies = computed(() => overlayRun(clients.companies, run.value))
  const running = computed(() => !!run.value && !runFinished(run.value))
  const loading = computed(() => clients.loading)
  const loadError = computed(() => clients.error)

  return { sample, companies, loading, loadError, run, running, actionError, start, retry, cancel, saveAccount, refresh: () => clients.refresh() }
}

/** 한 회사의 수집 자료 — 행을 고를 때만 부른다. 기간은 패널이 정한다(연도 · 1기 · 2기) */
export function useCollectedRows(session: Session, period: Ref<{ from: string, to: string }>) {
  const api = useCollectionService()
  const service = (): Service => api
  const key = computed(() => ['collection-rows', session.selectedClientId, period.value.from, period.value.to].join(':'))
  const rows = useAsyncData(key, (_nuxt, { signal }) => session.selectedClientId
    ? service().rows({ clientId: session.selectedClientId, ...period.value }, signal)
    : Promise.resolve({ data: [] as CollectedRow[] }), { server: false, getCachedData: () => undefined })
  onBeforeUnmount(() => rows.clear())
  return rows
}

/** 한 회사의 자료수집 이력 */
export function useCollectionHistory(session: Session) {
  const api = useCollectionService()
  const service = (): Service => api
  const key = computed(() => 'collection-history:' + session.selectedClientId)
  const history = useAsyncData(key, (_nuxt, { signal }) => session.selectedClientId
    ? service().history(session.selectedClientId, signal)
    : Promise.resolve({ data: [] as CollectionHistoryItem[] }), { server: false, getCachedData: () => undefined })
  onBeforeUnmount(() => history.clear())
  return history
}

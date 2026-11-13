import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { useAuth } from '~/features/auth/useAuth'
import { salesJournalSession } from './useSalesJournalSession'
import { previewSalesJournal } from '../services/previewSalesJournal'
import {
  copyDraft,
  createSalesJournalService,
  emptyDraft,
  filterRecords,
  sumAmounts,
  type SalesMeta,
  type SalesRecord,
} from '../services/salesJournal'
export function useSalesJournal() {
  const { activeTab, setDirty } = useWorkspaceContext()
  const tab = activeTab.value,
    session = salesJournalSession(tab)
  const { apiBase, pagesPreview } = useRuntimeConfig().public
  const auth = useAuth()
  const service = pagesPreview ? null : createSalesJournalService(async (path, options) =>
    $fetch(path, {
      baseURL: apiBase,
      ...options,
      ...(options?.method === 'DELETE' ? { body: {} } : {}),
      headers: { 'Content-Type': 'application/json', ...await auth.headers() },
      retry: 0,
      timeout: 15000,
    }),
  )
  const meta = ref<SalesMeta>()
  const busy = ref(false),
    loading = ref(true),
    error = ref(''),
    notice = ref(''),
    filterError = ref('')
  const searchOpen = ref(false),
    deleting = ref(false)
  const pending = ref<(() => void) | null>(null)
  const partners = computed(() =>
    (meta.value?.partners ?? []).map((row) => ({
      ...row,
      contact: '',
      status: '',
      amount: '',
      date: '',
    })),
  )
  const partnerName = computed(
    () => meta.value?.partners.find((row) => row.id === session.draft.partnerId)?.name ?? '',
  )
  const periodOptions = computed(() =>
    (meta.value?.periods ?? []).map((period) => ({
      value: period.id,
      label: `${period.label} (${period.start} ~ ${period.end})${period.status === 'closed' ? ' · 마감' : ''}`,
    })),
  )
  const accountOptions = computed(() => [
    { value: '', label: '계정과목 선택' },
    ...(meta.value?.accounts ?? []).map((account) => ({
      value: account.id,
      label: `${account.code} · ${account.name}`,
    })),
  ])
  const currentPeriod = computed(() =>
    meta.value?.periods.find((period) => period.id === session.draft.periodId),
  )
  const locked = computed(
    () =>
      session.rows.find((row) => row.id === session.selected)?.status === 'posted' ||
      currentPeriod.value?.status === 'closed',
  )
  const rows = computed(() => filterRecords(session.rows, session.applied))
  const supplyTotal = computed(() => sumAmounts(rows.value.map((row) => row.supply)))
  const vatTotal = computed(() => sumAmounts(rows.value.map((row) => row.vat)))
  const draftTotal = computed(() => sumAmounts([session.draft.supply, session.draft.vat]))
  const debit = computed(() =>
    sumAmounts(
      session.draft.lines.filter((line) => line.side === 'debit').map((line) => line.amount),
    ),
  )
  const credit = computed(() =>
    sumAmounts(
      session.draft.lines.filter((line) => line.side === 'credit').map((line) => line.amount),
    ),
  )
  function message(failure: unknown) {
    return (
      (failure as { data?: { error?: { message?: string } } })?.data?.error?.message ??
      '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    )
  }
  function edit() {
    setDirty(tab)
    notice.value = ''
    error.value = ''
  }
  function taxEdit() {
    session.draft.zeroVatConfirmed = false
    edit()
  }
  function protect(action: () => void) {
    if (tab.dirty) pending.value = action
    else action()
  }
  function reset() {
    const period = meta.value?.periods.find((period) => period.status === 'open')
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    session.selected = ''
    session.draft = {
      ...emptyDraft(),
      id: crypto.randomUUID(),
      periodId: period?.id ?? '',
      date: period
        ? today < period.start
          ? period.start
          : today > period.end
            ? period.end
            : today
        : '',
    }
    error.value = ''
    setDirty(tab, false)
  }
  function select(row: SalesRecord) {
    if (row.id === session.selected && !tab.dirty) return
    protect(() => {
      session.selected = row.id
      session.draft = copyDraft(row)
      error.value = ''
      notice.value = ''
      setDirty(tab, false)
    })
  }
  async function load() {
    loading.value = true
    error.value = ''
    try {
      const source = service ?? previewSalesJournal
      const [metadata, records] = await Promise.all([source.metadata(), source.list()])
      meta.value = metadata.data
      session.rows = records.data
      if (session.selected && !tab.dirty) {
        const selected = records.data.find((row) => row.id === session.selected)
        if (selected) session.draft = copyDraft(selected)
        else reset()
      }
      if (!session.initialized) {
        reset()
        session.filter = {
          from: meta.value.periods.at(-1)?.start ?? '',
          to: meta.value.periods[0]?.end ?? '',
          type: '',
          query: '',
        }
        session.applied = { ...session.filter }
        session.initialized = true
      }
    } catch (failure) {
      error.value = message(failure)
    } finally {
      loading.value = false
    }
  }
  function applyFilter() {
    if (!session.filter.from || !session.filter.to || session.filter.from > session.filter.to) {
      filterError.value = '조회 시작일과 종료일을 확인하세요.'
      return
    }
    session.applied = { ...session.filter }
    filterError.value = ''
  }
  function filterType(type: string) {
    session.filter.type = type
    applyFilter()
  }
  async function queryRecords() {
    applyFilter()
    if (!filterError.value) await load()
  }
  function partnerSelected(row: { id: string }) {
    session.draft.partnerId = row.id
    searchOpen.value = false
    edit()
  }
  async function save() {
    if (!service || busy.value || loading.value || !meta.value || locked.value) return
    busy.value = true
    error.value = ''
    try {
      const response = await service.save(session.draft)
      const index = session.rows.findIndex((row) => row.id === response.data.id)
      if (index < 0) session.rows.unshift(response.data)
      else session.rows[index] = response.data
      session.selected = response.data.id
      session.draft = copyDraft(response.data)
      setDirty(tab, false)
      notice.value =
        'DB에 미확정 전표로 저장했습니다.' +
        (rows.value.some((row) => row.id === response.data.id)
          ? ''
          : ' 현재 조회 조건 밖의 전표입니다.')
    } catch (failure) {
      error.value = message(failure)
    } finally {
      busy.value = false
    }
  }
  async function remove() {
    if (!service || busy.value) return
    deleting.value = false
    busy.value = true
    error.value = ''
    try {
      await service.remove(session.draft)
      session.rows = session.rows.filter((row) => row.id !== session.selected)
      reset()
      notice.value = '전표와 분개를 삭제했습니다.'
    } catch (failure) {
      error.value = message(failure)
    } finally {
      busy.value = false
    }
  }
  onMounted(load)
  return {
    pagesPreview,
    tab,
    session,
    meta,
    busy,
    loading,
    error,
    notice,
    filterError,
    searchOpen,
    deleting,
    pending,
    partners,
    partnerName,
    periodOptions,
    accountOptions,
    currentPeriod,
    locked,
    rows,
    supplyTotal,
    vatTotal,
    draftTotal,
    debit,
    credit,
    edit,
    taxEdit,
    protect,
    reset,
    select,
    load,
    queryRecords,
    filterType,
    partnerSelected,
    save,
    remove,
  }
}

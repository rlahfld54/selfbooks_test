import { computed, watch, ref, onMounted, onBeforeUnmount } from 'vue'
import { defineTabSession } from '~/composables/useTabSession'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { createMockAccounting } from './mockAccounting'
import { filterAccounts } from './logic'
import { createAccountDefaultsService } from './accountDefaultsService'
import { mapAccountDefaults } from './accountDefaults'
import { mapClientSummaries } from './clientSummaries'
import { useBackendApi } from '~/composables/useBackendApi'
import type { MockAccount, MockSummary } from './types'

const getSession = defineTabSession(() => ({
  summaryAccounts: [] as MockAccount[],
  summaryClientName: '',
  summaryLoadError: '',
  accounts: [] as MockAccount[],
  summaries: [] as MockSummary[],
  loaded: false,
  section: 'accounts',
  query: '',
  category: '',
  subcategory: '',
  active: '',
  selectedId: null as number | null,
  checked: [] as number[],
  compact: false,
  sort: 'code' as keyof MockAccount,
  descending: false,
  detailTab: '기본정보',
  summaryQuery: '',
  summaryAccount: '',
  summarySide: '',
  summaryFixed: '',
  accountDraft: null as MockAccount | null,
  addingAccount: false,
  summaryDraft: null as MockSummary | null,
  originalAccount: '',
  originalSummary: '',
}))
export function useAccountManagement() {
  const { activeTab, setDirty } = useWorkspaceContext()
  const tab = activeTab.value
  const state = getSession(tab)
  const preview = Boolean(useRuntimeConfig().public.pagesPreview)
  const service = createAccountDefaultsService(useBackendApi())
  const loading = ref(false)
  const loadError = ref('')
  let controller: AbortController | undefined
  async function load() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    loadError.value = ''
    try {
      let data: {
        accounts: MockAccount[]
        summaries: MockSummary[]
        summaryAccounts: MockAccount[]
        summaryClientName: string
        summaryLoadError: string
      }
      if (preview) {
        const mock = createMockAccounting()
        data = {
          ...mock,
          summaryAccounts: mock.accounts,
          summaryClientName: '미리보기',
          summaryLoadError: '',
        }
      } else {
        const [accountResult, summaryResult] = await Promise.allSettled([
          service.list(current.signal),
          service.summaries(current.signal),
        ])
        if (accountResult.status === 'rejected') throw accountResult.reason
        const accounts = mapAccountDefaults(accountResult.value.data)
        if (summaryResult.status === 'fulfilled') {
          const mapped = mapClientSummaries(summaryResult.value.data.summaries, accounts)
          data = {
            accounts,
            summaries: mapped.summaries,
            summaryAccounts: mapped.accounts,
            summaryClientName: summaryResult.value.data.client.name,
            summaryLoadError: '',
          }
        } else {
          // Keep existing memory edits on refresh failures rather than silently erase summaries.
          if (state.loaded) throw summaryResult.reason
          data = {
            accounts,
            summaries: [],
            summaryAccounts: [],
            summaryClientName: '',
            summaryLoadError:
              summaryResult.reason instanceof Error
                ? summaryResult.reason.message
                : '적요를 불러오지 못했습니다.',
          }
        }
      }
      if (current.signal.aborted) return false
      Object.assign(state, data, {
        loaded: true,
        selectedId: data.accounts[0]?.id ?? null,
        checked: [],
        query: '',
        category: '',
        subcategory: '',
        active: '',
        accountDraft: null,
        summaryDraft: null,
        summaryQuery: '',
        summaryAccount: '',
        summarySide: '',
        summaryFixed: '',
      })
      return true
    } catch (error) {
      if (!current.signal.aborted)
        loadError.value = error instanceof Error ? error.message : '계정과목을 불러오지 못했습니다.'
      return false
    } finally {
      if (controller === current) loading.value = false
    }
  }
  onMounted(() => {
    if (!state.loaded) void load()
  })
  onBeforeUnmount(() => controller?.abort())
  const dirty = computed(
    () =>
      (state.accountDraft !== null &&
        JSON.stringify(state.accountDraft) !== state.originalAccount) ||
      (state.summaryDraft !== null && JSON.stringify(state.summaryDraft) !== state.originalSummary),
  )
  watch(dirty, (value) => setDirty(tab, value), { immediate: true, flush: 'sync' })
  const rows = computed(() =>
    filterAccounts(
      state.accounts,
      state.query,
      state.category,
      state.subcategory,
      state.active,
    ).sort(
      (a, b) =>
        String(a[state.sort]).localeCompare(String(b[state.sort]), 'ko', { numeric: true }) *
        (state.descending ? -1 : 1),
    ),
  )
  const selected = computed(() => state.accounts.find((a) => a.id === state.selectedId))
  const summaries = computed(() =>
    state.summaries.filter(
      (s) =>
        (!state.summaryQuery.trim() ||
          (s.code + ' ' + s.name)
            .toLowerCase()
            .includes(state.summaryQuery.trim().toLowerCase())) &&
        (!state.summaryAccount || String(s.accountId) === state.summaryAccount) &&
        (!state.summarySide || s.side === state.summarySide) &&
        (!state.summaryFixed || String(s.isFixed) === state.summaryFixed),
    ),
  )
  const summaryAccounts = computed(() => {
    const actual = new Map(state.summaryAccounts.map((a) => [a.id, a]))
    return [...state.accounts.filter((a) => !actual.has(a.id)), ...actual.values()]
  })
  function editAccount(account?: MockAccount) {
    state.addingAccount = !account
    state.accountDraft = account
      ? { ...account }
      : {
          id: Math.max(0, ...state.accounts.map((a) => a.id)) + 1,
          code: '',
          name: '',
          displayName: '',
          category: '자산',
          subcategory: '당좌자산',
          balanceSide: 'DEBIT',
          isActive: true,
        }
    state.originalAccount = JSON.stringify(state.accountDraft)
  }
  function editSummary(summary?: MockSummary) {
    state.summaryDraft = summary
      ? { ...summary }
      : {
          id: Math.max(0, ...state.summaries.map((s) => s.id)) + 1,
          accountId: state.selectedId ?? state.accounts[0]?.id ?? 0,
          code: '',
          name: '',
          side: 'DEBIT',
          isFixed: false,
          isActive: true,
        }
    state.originalSummary = JSON.stringify(state.summaryDraft)
  }
  return {
    state,
    dirty,
    rows,
    selected,
    summaries,
    editAccount,
    editSummary,
    reset: load,
    loading,
    loadError,
    preview,
    summaryAccounts,
  }
}

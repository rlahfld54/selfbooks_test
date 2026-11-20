import { defineStore } from 'pinia'
import { createScopedState } from './helpers/scopedState.ts'
import type { MockAccount, MockSummary } from '../features/accounts/types'
export const createSummaryState = () => ({
  summaryAccounts: [] as MockAccount[],
  summaryClientName: '',
  summaryLoadError: '',
  summaries: [] as MockSummary[],
  summaryQuery: '',
  summaryAccount: '',
  summarySide: '',
  summaryFixed: '',
  summaryDraft: null as MockSummary | null,
  originalSummary: '',
})

export const useSummaryStore = defineStore('summaryStore', () =>
  createScopedState(createSummaryState),
)

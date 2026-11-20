import { defineStore } from 'pinia'
import { createScopedState } from './helpers/scopedState.ts'
import type { MockAccount } from '../features/accounts/types'
export const createAccountState = () => ({
  accounts: [] as MockAccount[],
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
  accountDraft: null as MockAccount | null,
  addingAccount: false,
  originalAccount: '',
})

export const useAccountStore = defineStore('accountStore', () =>
  createScopedState(createAccountState),
)

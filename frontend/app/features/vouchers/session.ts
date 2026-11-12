import { defineTabSession } from '~/composables/useTabSession'
import { loadMockRows } from './mockData'
import type { Mode } from './model'
const create = (mode: Mode) => ({ rows: loadMockRows(mode), selected: '', checked: [] as string[], insight: '거래처 정보', pinned: false, detail: true, from: '2026-11-01', to: '2026-11-30', focusKey: '', focusRequest: 0, initialized: false })
const general = defineTabSession(() => create('general'))
const sales = defineTabSession(() => create('sales'))
export const voucherSession = (tab: Parameters<typeof general>[0]) => tab.id === 'sales' ? sales(tab) : general(tab)

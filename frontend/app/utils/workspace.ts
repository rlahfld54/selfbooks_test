export const menu = [
  { id: 'home', title: '홈', icon: 'home' },
  { id: 'voucher', title: '일반전표입력', icon: 'document', group: '회계관리' },
  { id: 'ledger', title: '전표조회', icon: 'document', group: '회계관리' },
  { id: 'sales', title: '매입매출관리', icon: 'bag' },
  { id: 'partners', title: '거래처관리', icon: 'users', group: '매입매출관리' },
  { id: 'payroll', title: '인사급여', icon: 'users' },
  { id: 'tax', title: '세무신고', icon: 'calendar' },
  { id: 'reports', title: '보고서', icon: 'chart' },
  { id: 'settings', title: '환경설정', icon: 'settings' },
  { id: 'components', title: 'UI 컴포넌트', icon: 'grid' },
] as const
export type TabId = typeof menu[number]['id']
export interface WorkTab { id: TabId; dirty: boolean; query: string; panel: boolean; panelWidth: number; selected: string; draft: { date: string; memo: string; partner: string } }
export interface Workspace { tabs: WorkTab[]; active: TabId }
export const createTab = (id: TabId): WorkTab => ({ id, dirty: false, query: '', panel: false, panelWidth: 360, selected: '', draft: { date: '2026-11-09', memo: '', partner: '' } })
export const freshWorkspace = (): Workspace => ({ tabs: [createTab('home')], active: 'home' })
export function openTab(state: Workspace, id: TabId) {
  if (!menu.some(item => item.id === id)) return
  if (!state.tabs.some(tab => tab.id === id)) state.tabs.push(createTab(id))
  state.active = id
}
export function closeTab(state: Workspace, id: TabId, discard = false) {
  const index = state.tabs.findIndex(tab => tab.id === id)
  if (id === 'home' || index < 0) return false
  if (state.tabs[index]!.dirty && !discard) return false
  state.tabs.splice(index, 1)
  if (state.active === id) state.active = state.tabs[Math.max(0, index - 1)]!.id
  return true
}
// Persist only allowlisted UI settings. Drafts, selected records and free-text queries stay in memory.
export function serializeWorkspace(state: Workspace) {
  return JSON.stringify({ version: 1, tabs: state.tabs.map(({ id, panelWidth }) => ({ id, panelWidth })), active: state.active })
}
export function restoreWorkspace(raw: string | null): Workspace {
  const state = freshWorkspace()
  if (!raw) return state
  try {
    const saved = JSON.parse(raw)
    if (saved.version !== 1 || !Array.isArray(saved.tabs)) return state
    for (const entry of saved.tabs) {
      if (!entry || !menu.some(item => item.id === entry.id)) continue
      openTab(state, entry.id)
      const tab = state.tabs.find(tab => tab.id === entry.id)!
      tab.panelWidth = Number.isFinite(entry.panelWidth) ? Math.min(480, Math.max(320, entry.panelWidth)) : 360
    }
    state.active = state.tabs.some(tab => tab.id === saved.active) ? saved.active : 'home'
  } catch { /* Ignore corrupt or outdated storage. */ }
  return state
}
export const storageKey = (user: string, company: string) => 'accounting-pro:v1:' + encodeURIComponent(user) + ':' + encodeURIComponent(company)
export function formatAmount(value: unknown): string {
  const text = String(value ?? '')
  if (!/^-?\d+$/.test(text)) return text
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}


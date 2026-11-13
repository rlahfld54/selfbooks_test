export const menu = [
  { id: 'home', path: '/dashboard', title: '대시보드', icon: 'home' },
  { id: 'company', path: '/company', title: '회사등록', icon: 'users' },
  { id: 'accounts', path: '/accounts', title: '계정과목 및 적요관리', icon: 'document' },
  { id: 'opening-balances', path: '/opening-balances', title: '기초잔액관리', icon: 'wallet' },
  { id: 'collection', path: '/collection', title: '자료수집', icon: 'bag' },
  { id: 'closing', path: '/closing', title: '결산관리', icon: 'calendar' },
  { id: 'voucher', path: '/journal', title: '일반전표입력', icon: 'document' },
  { id: 'sales-journal', path: '/sales-journal', title: '매입매출전표입력', icon: 'document' },
  { id: 'ledger', path: '/ledger', title: '전표조회 및 검증', icon: 'document' },
  { id: 'sales', path: '/sales', title: '매입매출관리', icon: 'bag' },
  { id: 'partners', path: '/clients', title: '거래처관리', icon: 'users' },
  { id: 'clients', path: '/client-directory', title: '수임업체관리', icon: 'users' },
  { id: 'payroll', path: '/payroll', title: '인사급여', icon: 'users' },
  { id: 'tax', path: '/tax', title: '부가가치세', icon: 'calendar' },
  { id: 'reports', path: '/reports', title: '장부 및 재무제표', icon: 'chart' },
  { id: 'settings', path: '/settings', title: '환경등록', icon: 'settings' },
  { id: 'components', path: '/components', title: 'UI 컴포넌트', icon: 'grid' },
] as const
export type TabId = (typeof menu)[number]['id']
export const tabInfo = (id: TabId) => menu.find((item) => item.id === id)!

export const workspaceMenuGroups = [
  { title: '기초정보관리', icon: 'settings', items: [
    { id: 'company', label: '회사등록' },
    { id: 'settings', label: '환경등록' },
    { id: 'accounts', label: '계정과목 및 적요관리' },
    { id: 'partners', label: '거래처등록' },
    { id: 'opening-balances', label: '기초잔액관리' },
  ] },
  { title: '전표관리', icon: 'document', items: [
    { id: 'voucher', label: '일반전표입력', short: '일반' },
    { id: 'sales-journal', label: '매입매출전표입력', short: '매입출' },
    { id: 'ledger', label: '전표조회 및 검증', short: '조회' },
  ] },
] as const satisfies readonly { title: string; icon: string; items: readonly { id: TabId; label: string; short?: string }[] }[]

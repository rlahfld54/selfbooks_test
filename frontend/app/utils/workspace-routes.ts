export const menu = [
  { id: 'home', path: '/', title: '홈', icon: 'home' },
  { id: 'voucher', path: '/journal', title: '일반전표입력', icon: 'document' },
  { id: 'sales-journal', path: '/sales-journal', title: '매입매출전표입력', icon: 'document' },
  { id: 'ledger', path: '/ledger', title: '전표조회', icon: 'document' },
  { id: 'sales', path: '/sales', title: '매입매출관리', icon: 'bag' },
  { id: 'partners', path: '/clients', title: '거래처관리', icon: 'users' },
  { id: 'clients', path: '/client-directory', title: '수임업체관리', icon: 'users' },
  { id: 'payroll', path: '/payroll', title: '인사급여', icon: 'users' },
  { id: 'tax', path: '/tax', title: '세무신고', icon: 'calendar' },
  { id: 'reports', path: '/reports', title: '보고서', icon: 'chart' },
  { id: 'settings', path: '/settings', title: '환경설정', icon: 'settings' },
  { id: 'components', path: '/components', title: 'UI 컴포넌트', icon: 'grid' },
] as const
export type TabId = typeof menu[number]['id']
export const tabInfo = (id: TabId) => menu.find(item => item.id === id)!


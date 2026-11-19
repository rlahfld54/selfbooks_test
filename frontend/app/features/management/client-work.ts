import type { TabId } from '../../utils/workspace-routes'

export const clientWorkLinks = [
  { id: 'company', path: '/company', title: '회사등록', description: '회사등록 상세 화면 준비 중', enabled: false },
  { id: 'settings', path: '/settings', title: '환경등록', description: '회계·세무 환경 검토', enabled: true },
  { id: 'accounts', path: '/accounts', title: '계정과목 및 적요관리', description: '계정과목과 적요 조회', enabled: true },
  { id: 'voucher', path: '/journal', title: '일반전표입력', description: '일반전표 목업 입력', enabled: true },
  { id: 'sales-journal', path: '/sales-journal', title: '매입매출전표입력', description: '기존 서버 지정 회사의 전표 화면', enabled: true },
] as const
// 자료수집(collection)은 사무소 전체 업체를 한 표로 보는 화면이라 업체 하나에 묶지 않는다
export const isClientWork = (id: TabId | undefined) => !!id && !['home', 'clients', 'organization', 'mypage', 'components', 'collection'].includes(id)

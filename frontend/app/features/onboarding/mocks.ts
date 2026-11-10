import type { OnboardingData } from './types'
export const steps = [
  { title: '사무소 기본정보', description: '사무소 정보와 연락처를 입력합니다.', icon: 'home' },
  { title: '사용자 및 권한', description: '관리자 확인 및 직원 초대', icon: 'users' },
  { title: '업무 기본환경', description: '회계연도와 기본 설정', icon: 'settings' },
  { title: '거래처 등록', description: '주요 거래처 등록 또는 가져오기', icon: 'bag' },
  { title: '설정 확인', description: '입력한 내용을 확인하고 완료하기', icon: 'check' },
]
export function createOnboardingData(): OnboardingData {
  return {
    office: { name: '샘플 세무회계사무소', registration: '123-45-67890', representative: '김세무', phone: '02-1234-5678', address: '서울특별시 강남구 테헤란로 123', email: 'tax@sample.co.kr' },
    staff: [{ id: 's1', name: '김세무', role: '관리자', status: '활성' }, { id: 's2', name: '이회계', role: '직원', status: '활성' }, { id: 's3', name: '박주임', role: '직원', status: '초대 대기' }],
    settings: { year: 2026, startMonth: 1, endMonth: 12, dateFormat: 'YYYY-MM-DD', amountFormat: '천 단위 구분', landing: '대시보드', notifications: true },
    clients: [{ id: 'c1', name: '가나다상사', type: '개인사업자', status: '정상' }, { id: 'c2', name: 'ABC테크 주식회사', type: '법인사업자', status: '정상' }],
    completed: false, step: 1,
  }
}

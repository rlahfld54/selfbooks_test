import type { OnboardingData } from './types'
export function validateStep(data: OnboardingData, step: number): string {
  if (step === 1) {
    const o = data.office
    if ([o.name, o.registration, o.representative, o.phone, o.address].some(v => !v.trim())) return '필수 항목을 모두 입력해 주세요.'
    if (!/^\d{3}-\d{2}-\d{5}$/.test(o.registration)) return '사업자등록번호는 123-45-67890 형식으로 입력해 주세요.'
    if (!/^[\d+() -]{9,20}$/.test(o.phone)) return '연락처 형식을 확인해 주세요.'
    if (o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) return '이메일 형식을 확인해 주세요.'
  }
  if (step === 2 && data.staff.some(s => !s.name.trim())) return '직원 이름을 입력해 주세요.'
  if (step === 3) {
    const s = data.settings
    if (!Number.isInteger(s.year) || s.year < 2000 || s.year > 2100) return '회계연도는 2000~2100 사이로 입력해 주세요.'
    if (s.startMonth > s.endMonth) return '종료 월은 시작 월 이후로 선택해 주세요.'
  }
  return ''
}
export function isOnboardingData(value: unknown): value is OnboardingData {
  if (!value || typeof value !== 'object') return false
  const d = value as OnboardingData
  return typeof d.completed === 'boolean' && Number.isInteger(d.step) && d.step >= 1 && d.step <= 5
    && !!d.office && ['name','registration','representative','phone','address','email'].every(k => typeof d.office[k as keyof typeof d.office] === 'string')
    && Array.isArray(d.staff) && d.staff.every(s => s && typeof s.id === 'string' && typeof s.name === 'string' && ['관리자','직원'].includes(s.role) && ['활성','초대 대기'].includes(s.status))
    && Array.isArray(d.clients) && d.clients.every(c => c && typeof c.id === 'string' && typeof c.name === 'string' && ['개인사업자','법인사업자'].includes(c.type) && c.status === '정상')
    && !!d.settings && Number.isInteger(d.settings.year) && [d.settings.startMonth,d.settings.endMonth].every(m => Number.isInteger(m) && m >= 1 && m <= 12)
    && ['YYYY-MM-DD','YYYY.MM.DD','YYYY/MM/DD'].includes(d.settings.dateFormat) && ['천 단위 구분','구분 없음'].includes(d.settings.amountFormat) && ['대시보드','일반전표'].includes(d.settings.landing) && typeof d.settings.notifications === 'boolean'
}

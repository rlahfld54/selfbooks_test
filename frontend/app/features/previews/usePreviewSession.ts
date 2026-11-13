import { defineTabSession } from '~/composables/useTabSession'
import { createRegistrationReview } from './registrationReview'
export const previewSession = defineTabSession(() => ({ query: '' }))


export const environmentSections = {
  기본설정: ['업태·종목 표시', '직원 채용 여부'],
  부가세설정: ['의제매입세액공제', '간주임대료', '간주공급'],
  '경비/차량': ['식대 불공제', '차량 보유현황', '승용차 불공제'],
  '거래처/품목': ['주요 거래처', '품목 매핑'],
  자동화규칙: ['매출 적요', '매입 적요', '거래 인식 규칙', '분류 규칙'],
} as const
export type EnvironmentSection = keyof typeof environmentSections
export const environmentSession = defineTabSession(createRegistrationReview)

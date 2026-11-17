import { defineTabSession } from '~/composables/useTabSession'
export const accountManagementSession = defineTabSession(() => ({
  section: '계정과목관리' as '계정과목관리' | '거래적요관리' | '연결관계',
  query: '',
}))


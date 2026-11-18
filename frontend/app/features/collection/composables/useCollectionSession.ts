import { defineTabSession } from '~/composables/useTabSession'
import { defaultPeriod } from '../logic'

// 탭을 옮겨도 검색어 · 조회기간 · 진행 중인 작업을 잃지 않는다. 탭을 닫으면 함께 사라진다.
export const collectionSession = defineTabSession(() => ({
  query: '',
  manager: '',
  ...defaultPeriod(new Date()),
  runId: '',
  dockOpen: false,
  dockMinimized: false,
  /** 진행 목록에서 닫은 줄 (화면에서만 숨긴다) */
  hidden: [] as string[],
  selectedClientId: '',
}))

import { defineStore } from 'pinia'
import { createScopedState } from './helpers/scopedState.ts'

export const createOrganizationState = () => ({
      '회계법인명/사무소명': '회계법인 원지', '사업자등록번호': '000-00-00000',
      '법인등록번호': '000000-0000000', '대표자명': '김원지',
      '사업장 주소': '서울특별시 금천구 디지털로 00', '업태': '전문 서비스업', '종목': '세무·회계 서비스',
      '대표전화': '02-0000-0000', '대표 이메일': 'office@aat-demo.example', '팩스번호': '02-0000-0001',
      '세무대리인 관리번호': 'DEMO-00001', '사무소 구분': '회계법인', '기타 등록정보': '테스트 데이터',
    } as Record<string, string>)

export const useOrganizationStore = defineStore('organizationStore', () =>
  createScopedState(createOrganizationState),
)

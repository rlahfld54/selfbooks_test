import { defineStore } from 'pinia'
import { createScopedState } from './helpers/scopedState.ts'

export const createPermissionState = () => ({
  roles: ['조직 관리자', '일반 사용자'],
  sample: true,
  rows: [
    { id: 'organization', label: '조직 정보 수정', admin: true, member: false },
    { id: 'staff', label: '직원 초대 및 관리', admin: true, member: false },
    { id: 'registerClient', label: '수임업체 등록', admin: true, member: true },
    { id: 'editClient', label: '수임업체 정보 수정', admin: true, member: true },
    { id: 'viewClient', label: '담당 수임업체 조회', admin: true, member: true },
    { id: 'voucher', label: '전표 조회 및 입력', admin: true, member: true },
    { id: 'closing', label: '마감 처리', admin: true, member: false },
    { id: 'filing', label: '신고 관련 업무', admin: true, member: true },
  ],
})

export const usePermissionStore = defineStore('permissionStore', () =>
  createScopedState(createPermissionState),
)

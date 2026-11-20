import { defineStore } from 'pinia'
import { createScopedState } from './helpers/scopedState.ts'

export const createBranchState = () => ([
      { id: 'B1', name: '회계법인 원지 본사', address: '서울특별시 금천구 디지털로 00', phone: '02-0000-0000', status: '활성', kind: '본사', count: '6' },
      { id: 'B2', name: '관악지점', address: '서울특별시 관악구 남부순환로 00', phone: '02-0000-0002', status: '활성', kind: '지점', count: '2' },
    ])

export const useBranchStore = defineStore('branchStore', () =>
  createScopedState(createBranchState),
)

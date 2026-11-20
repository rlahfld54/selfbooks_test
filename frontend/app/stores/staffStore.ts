import { defineStore } from 'pinia'
import { createScopedState } from './helpers/scopedState.ts'
import { staff } from '../features/management/data.ts'
export const createStaffState = () => (staff.map(person => ({ ...person })))

export const useStaffStore = defineStore('staffStore', () =>
  createScopedState(createStaffState),
)

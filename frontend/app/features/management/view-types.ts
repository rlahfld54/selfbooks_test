import type { Client, Staff } from './data'
import type { createManagementData } from './session'

export interface ManagementFilters {
  query: string
  biz: string
  kind: string
  status: string
  person: string
  review: string
  team: string
  role: string
}

export interface ManagementRows {
  person: Staff
  organization: Record<string, string>
  clients: Client[]
  staff: Staff[]
  branches: ReturnType<typeof createManagementData>['branches']
  filteredClients: Client[]
  filteredStaff: Staff[]
  clientStats: { total: number; active: number; reviewPending: number; ended: number }
}

export type ManagementDestination = 'client-work' | 'sales-journal' | 'company' | 'settings' | 'accounts' | 'voucher' | 'organization'

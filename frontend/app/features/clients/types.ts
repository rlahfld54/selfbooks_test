export interface ClientRecord {
  primaryAssignment?: { userId: string; name: string | null } | null
  id: string
  office_id: string
  source_tax_office_id: string | null
  client_name: string
  taxpayer_kind: '개인' | '법인'
  business_registration_number: string | null
  representative_name: string | null
  address: string | null
  status: 'pending' | 'active' | 'ended'
  engagement_start_date: string | null
  engagement_end_date: string | null
  created_at: string
  updated_at: string
}

export interface AssignedClient {
  assignment: {
    office_id: string
    client_id: string
    user_id: string
    assignment_role: 'PRIMARY' | 'SECONDARY'
    created_at: string
  }
  client: ClientRecord
}


export type ClientRecord = {
  id: string
  officeId: string
  name: string
  taxpayerKind: string
  status: string
  primaryAssignment?: { userId: string; name: string | null } | null
  business_registration_number: string | null
  representative_name: string | null
  address: string | null
  engagement_start_date: string | null
  engagement_end_date: string | null
}

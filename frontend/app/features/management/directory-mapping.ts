import type { ClientRecord } from '../client-directory/types/client'
import type { Client } from './data'

// Only map fields supplied by the existing API. Missing details are not mock values.
export function mapDirectoryClients(records: ClientRecord[], previous: Client[] = []): Client[] {
  const assignments = new Map(previous.map((client) => [client.id, client]))
  return records.map((record) => {
    const assigned = assignments.get(record.id)
    return {
      id: record.id,
      name: record.name,
      type: record.taxpayerKind,
      status: record.status === 'active' ? '수임 중' : record.status,
      biz: record.business_registration_number ?? '',
      ceo: record.representative_name ?? '',
      address: record.address ?? '',
      start: record.engagement_start_date ?? '',
      end: record.engagement_end_date ?? '',

      // API에 없는 검토 상태는 그대로 유지
      company: '',
      environment: '',
      chart: '',
      // A supplied DB assignment (including null) supersedes temporary screen state.
      primaryId: record.primaryAssignment !== undefined
        ? record.primaryAssignment?.userId
        : assigned?.primaryId,
      secondaryIds: [...(assigned?.secondaryIds ?? [])],
      primary: record.primaryAssignment !== undefined
        ? record.primaryAssignment?.name ?? ''
        : assigned?.primary ?? '',
      secondary: [...(assigned?.secondary ?? [])],
    }
  })
}

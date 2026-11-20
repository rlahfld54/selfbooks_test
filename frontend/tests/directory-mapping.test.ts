import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapDirectoryClients } from '../app/features/management/directory-mapping.ts'
import { assignmentSummary, needsReview } from '../app/features/management/assignments.ts'

const record = { id: 'db-uuid', officeId: 'office', name: 'DB 조회 업체', taxpayerKind: '법인', status: 'active',
  business_registration_number: null, representative_name: null, address: null,
  engagement_start_date: null, engagement_end_date: null }

test('database primary assignment populates my clients using the authenticated UUID', () => {
  const clients = mapDirectoryClients([{ ...record, primaryAssignment: { userId: 'onegi-uuid', name: '담당자' } }])
  assert.equal(clients[0]!.primary, '담당자')
  assert.deepEqual(assignmentSummary(clients, 'onegi-uuid'), { total: 1, primary: 1, secondary: 0, review: 0 })
  assert.equal(assignmentSummary(clients, 'onegi').total, 0)
  assert.equal(assignmentSummary(clients, 'other-user').total, 0)
})

test('refresh reflects database reassignment and removal instead of retaining stale primary assignments', () => {
  const previous = mapDirectoryClients([{ ...record, primaryAssignment: { userId: 'old-user', name: '이전' } }])
  const changed = mapDirectoryClients([{ ...record, primaryAssignment: { userId: 'new-user', name: null } }], previous)
  assert.equal(changed[0]!.primaryId, 'new-user')
  assert.equal(changed[0]!.primary, '')
  const removed = mapDirectoryClients([{ ...record, primaryAssignment: null }], previous)
  assert.equal(removed[0]!.primaryId, undefined)
  assert.equal(removed[0]!.primary, '')
  assert.equal(assignmentSummary(removed, 'old-user').total, 0)
})
test('maps API IDs and values without filling missing details or assignments with sample data', () => {
  const [client] = mapDirectoryClients([record])
  assert.equal(client!.id, record.id)
  assert.equal(client!.name, record.name)
  assert.equal(client!.status, '수임 중')
  assert.equal(client!.type, '법인')
  for (const field of ['biz', 'ceo', 'address', 'company', 'environment', 'primary'] as const) {
    assert.equal(client![field], '')
  }
  assert.equal(needsReview(client!), false)
  assert.deepEqual(assignmentSummary([client!], 'me'), { total: 0, primary: 0, secondary: 0, review: 0 })
})
test('refresh preserves temporary assignments only for the same database ID', () => {
  const original = mapDirectoryClients([record])[0]!
  Object.assign(original, { primaryId: 'me', primary: '사용자', secondaryIds: ['other'], secondary: ['보조'] })
  const [updated] = mapDirectoryClients([{ ...record, name: 'DB 수정 업체' }], [original])
  assert.equal(updated!.name, 'DB 수정 업체')
  assert.equal(updated!.primaryId, 'me')
  assert.deepEqual(updated!.secondaryIds, ['other'])
  assert.notEqual(updated!.secondaryIds, original.secondaryIds)
  const [different] = mapDirectoryClients([{ ...record, id: 'different' }], [original])
  assert.equal(different!.primaryId, undefined)
  assert.deepEqual(mapDirectoryClients([], [original]), [])
})
test('unknown status values are preserved rather than interpreted as ended or pending', () => {
  assert.equal(mapDirectoryClients([{ ...record, status: 'unknown' }])[0]!.status, 'unknown')
})

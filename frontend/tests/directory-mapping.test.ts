import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapDirectoryClients } from '../app/features/management/directory-mapping.ts'
import { assignmentSummary, needsReview } from '../app/features/management/assignments.ts'

const record = { id: 'db-uuid', officeId: 'office', name: 'DB 조회 업체', taxpayerKind: '법인', status: 'active' }
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

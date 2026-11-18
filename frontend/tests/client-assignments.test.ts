import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assignmentRole, assignmentSummary, assignById, canManageClients, canOpenClient } from '../app/features/management/assignments.ts'
import { clients, staff } from '../app/features/management/data.ts'
import { filterClients } from '../app/features/management/management.ts'

test('roles default to least privilege, with OWNER and ADMIN management access', () => {
  assert.equal(canManageClients('OWNER'), true)
  assert.equal(canManageClients('ADMIN'), true)
  for (const role of ['STAFF', '', 'unknown']) {
    assert.equal(canManageClients(role), false)
  }
})
test('ID assignments deduplicate assistants and do not match display names', () => {
  const assignment = assignById(staff, 'U001', ['U001', 'U002', 'U002', 'U008', 'missing'])
  assert.deepEqual(assignment.secondaryIds, ['U002'])
  const client = { ...clients[0]!, ...assignment }
  assert.equal(assignmentRole(client, 'U001'), '주담당')
  assert.equal(assignmentRole(client, 'U002'), '보조담당')
  assert.equal(assignmentRole(client, '김원지'), '')
  assert.throws(() => assignById(staff, 'U008', []))
  assert.throws(() => assignById(staff, '', []))
})
test('summaries update with assignment changes and count review statuses once per client', () => {
  const rows = [
    { ...clients[0]!, primaryId: 'me', secondaryIds: ['me'] },
    { ...clients[1]!, primaryId: 'other', secondaryIds: ['me'] },
  ]
  assert.deepEqual(assignmentSummary(rows, 'me'), { total: 2, primary: 1, secondary: 1, review: 1 })
  rows[0]!.primaryId = 'other'
  rows[0]!.secondaryIds = []
  assert.deepEqual(assignmentSummary(rows, 'me'), { total: 1, primary: 0, secondary: 1, review: 0 })
  assert.deepEqual(assignmentSummary([], 'me'), { total: 0, primary: 0, secondary: 0, review: 0 })
})
test('STAFF access rejects unknown, unassigned and anonymous client requests', () => {
  const user = { id: 'me', name: 'User', email: '', role: 'STAFF' }
  const client = { ...clients[0]!, primaryId: 'other', secondaryIds: ['me'] }
  assert.equal(canOpenClient(client, user), true)
  assert.equal(canOpenClient({ ...client, secondaryIds: [] }, user), false)
  assert.equal(canOpenClient(undefined, user), false)
  assert.equal(canOpenClient(client, null), false)
  assert.equal(canOpenClient(client, { ...user, role: 'unexpected' }), false)
})
test('unified search supports company name and formatted/unformatted registration numbers', () => {
  for (const query of ['한빛', '000-11-10001', '0001110001']) {
    assert.deepEqual(filterClients(clients, query, '', '', '', '', '').map(row => row.id), ['C001'])
  }
  assert.equal(filterClients(clients, '없는 업체', '', '', '', '', '').length, 0)
})

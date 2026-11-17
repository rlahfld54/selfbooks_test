import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterClients, assignedPeople } from '../app/features/management/management.ts'
import { clients, staff } from '../app/features/management/data.ts'

test('client search combines registration number, assignment and review filters', () => {
  assert.deepEqual(filterClients(clients, '네오', '0002210002', '법인', '수임 중', '정하늘', '검토 완료').map(row => row.id), ['C002'])
})

test('unmatched filters return an empty list without altering source data', () => {
  assert.equal(filterClients(clients, '없는업체', '', '', '', '', '').length, 0)
  assert.equal(clients.length, 10)
})

test('assignment removes primary duplicates and inactive assistants', () => {
  assert.deepEqual(assignedPeople(staff, '이수현', ['이수현', '박민준', '박민준', '윤가은']), { primary: '이수현', secondary: ['박민준'] })
})

test('an invited or missing employee cannot be the primary assignee', () => {
  assert.throws(() => assignedPeople(staff, '윤가은', []), /활성 직원/)
  assert.throws(() => assignedPeople(staff, '', []), /활성 직원/)
})

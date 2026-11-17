import test from 'node:test'
import assert from 'node:assert/strict'
import { mapProfile } from '../app/features/management/profile-mapping.ts'

test('maps API data to existing profile fields without inventing missing values', () => {
  const mapped = mapProfile({
    user: { id: 'user', name: '홍길동', email: 'user@example.test', officeId: 'office', role: 'ADMIN' },
    office: { id: 'office', name: '사무소', business_registration_number: '123', representative_name: '대표', representative_phone: null, address: '주소' },
  })
  assert.equal(mapped.person.name, '홍길동')
  assert.equal(mapped.person.role, '조직 관리자')
  assert.equal(mapped.person.status, '활성')
  for (const field of ['login', 'phone', 'team', 'title', 'joined'] as const) assert.equal(mapped.person[field], '')
  assert.equal(mapped.organization['회계법인명/사무소명'], '사무소')
  assert.equal(mapped.organization['대표전화'], '')
  assert.equal(mapped.organization['대표 이메일'], '')
})

test('unloaded profile contains no sample identity or active status', () => {
  const mapped = mapProfile()
  assert.ok(Object.values(mapped.person).every(value => value === ''))
  assert.ok(Object.values(mapped.organization).every(value => value === ''))
})

test('maps confirmed user and membership columns into the existing screen', () => {
  const mapped = mapProfile({
    user: { id: 'auth-uuid', userCode: 'U001', loginId: 'onegi', name: '회계법인 원지', email: 'user@example.test', officeId: 'office', role: 'OWNER', phone: '01000000000', departmentName: '세무1팀', jobTitle: '조직관리자', joinedAt: '2026-11-13T07:56:18Z' },
    office: { id: 'office', name: '사무소', business_registration_number: null, representative_name: null, representative_phone: null, address: null },
  })
  assert.equal(mapped.person.id, 'auth-uuid')
  assert.equal(mapped.person.login, 'onegi')
  assert.equal(mapped.person.phone, '010-0000-0000')
  assert.equal(mapped.person.team, '세무1팀')
  assert.equal(mapped.person.title, '조직관리자')
  assert.equal(mapped.person.role, '조직 소유자')
})

test('null optional fields remain blank while user ID uses the auth UUID', () => {
  const mapped = mapProfile({
    user: { id: 'auth-uuid', name: '사용자', email: 'user@example.test', officeId: 'office', role: 'ADMIN', userCode: null, loginId: null, phone: null, departmentName: null, jobTitle: null, joinedAt: null },
    office: { id: 'office', name: '사무소', business_registration_number: null, representative_name: null, representative_phone: null, address: null },
  })
  assert.equal(mapped.person.id, 'auth-uuid')
  for (const key of ['login', 'phone', 'team', 'title', 'joined'] as const) assert.equal(mapped.person[key], '')
})

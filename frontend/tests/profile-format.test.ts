import test from 'node:test'
import assert from 'node:assert/strict'
import { formatProfileField } from '../app/features/management/profile-format.ts'
import { mapProfile } from '../app/features/management/profile-mapping.ts'

test('profile formatting trims names, normalizes email and formats valid phone numbers', () => {
  assert.equal(formatProfileField('name', ' 김원지 '), '김원지')
  assert.equal(formatProfileField('email', ' User@Example.COM '), 'user@example.com')
  assert.equal(formatProfileField('phone', '01025521549'), '010-2552-1549')
  assert.equal(formatProfileField('phone', '0212345678'), '02-1234-5678')
  assert.equal(formatProfileField('phone', '15881234'), '1588-1234')
  assert.equal(formatProfileField('phone', '010-2552-1549'), '010-2552-1549')
})

test('formatting preserves malformed numbers and identity fields without guessing', () => {
  for (const value of ['01012', '+82 10 1234 5678', '010-ABCD-1234']) assert.equal(formatProfileField('phone', value), value)
  for (const key of ['email', 'phone', 'name']) assert.equal(formatProfileField(key, null), '')
  assert.equal(formatProfileField('login', 'CaseSensitive'), 'CaseSensitive')
  assert.equal(formatProfileField('email', 'bad email'), 'bad email')
})

test('mapping formats existing profile and organization fields without mutating API data', () => {
  const source = {
    user: { id: 'auth-uuid', userCode: 'U001', name: ' 김원지 ', email: ' User@Example.COM ', officeId: 'office', role: 'ADMIN', phone: '01025521549' },
    office: { id: 'office', name: '사무소', business_registration_number: '1234567890', representative_name: '대표', representative_phone: '0212345678', address: null },
  }
  const mapped = mapProfile(source)
  assert.equal(mapped.person.id, 'auth-uuid')
  assert.equal(mapped.person.email, 'user@example.com')
  assert.equal(mapped.person.phone, '010-2552-1549')
  assert.equal(mapped.organization['사업자등록번호'], '123-45-67890')
  assert.equal(mapped.organization['대표전화'], '02-1234-5678')
  assert.equal(source.user.phone, '01025521549')
  assert.equal(source.user.email, ' User@Example.COM ')
})

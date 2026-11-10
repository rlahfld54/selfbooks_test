import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRegistration, isMockAccount, isMockUser, mockVerifier, normalizeEmail } from '../app/features/auth/validation.ts'
const valid = { name: '김테스트', email: 'new@example.test', password: 'Test1234!', confirmation: 'Test1234!', accepted: true }

test('registration validates name, email, password strength, confirmation and agreement', () => {
  assert.equal(validateRegistration(valid), '')
  assert.match(validateRegistration({ ...valid, name: ' ' }), /이름/)
  assert.match(validateRegistration({ ...valid, email: 'invalid' }), /이메일/)
  assert.match(validateRegistration({ ...valid, password: 'short' }), /8자/)
  assert.match(validateRegistration({ ...valid, password: 'onlyletters' }), /영문/)
  assert.match(validateRegistration({ ...valid, confirmation: 'different' }), /일치/)
  assert.match(validateRegistration({ ...valid, accepted: false }), /약관/)
  assert.equal(normalizeEmail('  NEW@Example.Test '), valid.email)
})

test('mock verifier is deterministic, salted, and different for wrong passwords', async () => {
  const salt = 'a'.repeat(32)
  const verifier = await mockVerifier(valid.password, salt)
  assert.match(verifier, /^[a-f0-9]{64}$/)
  assert.equal(verifier, await mockVerifier(valid.password, salt))
  assert.notEqual(verifier, await mockVerifier('wrong', salt))
  assert.notEqual(verifier, await mockVerifier(valid.password, 'b'.repeat(32)))
  assert.ok(!verifier.includes(valid.password))
})

test('storage parser rejects invalid users and incomplete account records', () => {
  const user = { id: 'demo-admin', name: '관리자', email: 'admin@accountingpro.test' }
  assert.ok(isMockUser(user))
  assert.ok(isMockAccount({ ...user, salt: 'a'.repeat(32), verifier: 'b'.repeat(64) }))
  for (const value of [null, [], {}, { ...user, id: '../bad' }, { ...user, email: 'broken' }]) assert.equal(isMockUser(value), false)
  for (const value of [user, { ...user, password: valid.password }, { ...user, salt: 'bad', verifier: 'bad' }]) assert.equal(isMockAccount(value), false)
})

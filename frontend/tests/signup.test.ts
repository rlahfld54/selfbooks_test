import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmationError, emailError, infoError, loginIdError, passwordError, phoneError, requiredTermsAgreed, validCode } from '../app/features/auth/signup.ts'

const info = { loginId: 'hong01', password: 'Test1234', confirmation: 'Test1234', phone: '010-1234-5678', email: 'hong@example.test' }

test('required terms are service, privacy and entrust; marketing is optional', () => {
  assert.equal(requiredTermsAgreed({ service: true, privacy: true, entrust: true, marketing: false }), true)
  assert.equal(requiredTermsAgreed({ service: true, privacy: true, entrust: false, marketing: true }), false)
})

test('login id, password, confirmation, phone and email rules', () => {
  assert.equal(loginIdError('hong01'), '')
  assert.match(loginIdError(''), /필수/)
  assert.match(loginIdError('ab'), /5~20/)
  assert.match(loginIdError('한글아이디'), /5~20/)
  assert.equal(passwordError('Test1234'), '')
  assert.match(passwordError('short1'), /8자/)
  assert.match(passwordError('onlyletters'), /8자/)
  assert.match(confirmationError('Test1234', 'Test9999'), /일치/)
  assert.equal(phoneError('01012345678'), '')
  assert.match(phoneError('1234'), /확인/)
  assert.equal(emailError('a@b.co'), '')
  assert.match(emailError('invalid'), /형식/)
})

test('info step needs the id duplicate check and returns the first error', () => {
  assert.equal(infoError(info, true), '')
  assert.match(infoError(info, false), /중복확인/)
  assert.match(infoError({ ...info, email: '' }, true), /필수/)
})

test('demo verification code accepts any 6 digits only', () => {
  assert.equal(validCode('123456'), true)
  assert.equal(validCode('12345'), false)
  assert.equal(validCode('abcdef'), false)
})

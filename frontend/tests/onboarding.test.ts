import test from 'node:test'
import assert from 'node:assert/strict'
import { createOnboardingData } from '../app/features/onboarding/mocks.ts'
import { validateStep, isOnboardingData } from '../app/features/onboarding/validation.ts'

test('onboarding samples are isolated and valid across all steps', () => {
  const data = createOnboardingData()
  assert.ok(isOnboardingData(JSON.parse(JSON.stringify(data))))
  for (let step = 1; step <= 4; step++) assert.equal(validateStep(data, step), '')
  data.office.name = 'changed'; data.staff.pop()
  assert.equal(createOnboardingData().staff.length, 3)
  assert.equal(createOnboardingData().office.name, '샘플 세무회계사무소')
})
test('required office fields and malformed contacts prevent advancement', () => {
  const data = createOnboardingData()
  data.office.name = ' '
  assert.match(validateStep(data, 1), /필수/)
  data.office.name = '사무소'; data.office.registration = '123'
  assert.match(validateStep(data, 1), /사업자등록번호/)
  data.office.registration = '123-45-67890'; data.office.email = 'invalid'
  assert.match(validateStep(data, 1), /이메일/)
})
test('invalid year, reversed period and empty staff names are rejected', () => {
  const data = createOnboardingData()
  data.settings.year = 0
  assert.match(validateStep(data, 3), /회계연도/)
  data.settings.year = 2026; data.settings.startMonth = 12; data.settings.endMonth = 1
  assert.match(validateStep(data, 3), /종료 월/)
  data.staff[0]!.name = ''
  assert.match(validateStep(data, 2), /직원 이름/)
})
test('restore rejects malformed nested data and unsupported settings', () => {
  for (const value of [null, {}, { completed: true }, { ...createOnboardingData(), staff: [null] }, { ...createOnboardingData(), step: 99 }]) assert.equal(isOnboardingData(value), false)
  const data = createOnboardingData(); data.settings.dateFormat = 'unknown'
  assert.equal(isOnboardingData(data), false)
})

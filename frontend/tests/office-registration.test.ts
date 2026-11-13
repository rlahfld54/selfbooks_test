import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyOfficeRegistration } from '../app/features/previews/officeRegistrationData.ts'
import { createRegistrationReview, editRegistrationField } from '../app/features/previews/registrationReview.ts'

test('DB fields and confirmations populate the review without losing account leading zeros', () => {
  const state = createRegistrationReview()
  applyOfficeRegistration(state, { name: '원지', corporate_registration_number: '0123456789012',
    refund_bank_name: '은행', refund_account_number: '001234', refund_account_holder: '원지', basic_info_reviewed_at: '2026-11-13' })
  assert.equal(state.values['회사명'], '원지')
  assert.equal(state.values['법인등록번호'], '0123456789012')
  assert.equal(state.values['환급계좌'], '은행 / 001234 / 원지')
  assert.equal(state.reviewed['기본정보'], true)
  editRegistrationField(state, '기본정보', '회사명', '수정')
  assert.equal(state.original['회사명'], '원지')
  assert.equal(state.reviewed['기본정보'], false)
})
test('missing database values display empty inputs without stale review state', () => {
  const state = createRegistrationReview()
  state.reviewed['기본정보'] = true
  applyOfficeRegistration(state, { name: '원지', address: null })
  assert.equal(state.values['주소'], '')
  assert.equal(state.values['환급계좌'], '')
  assert.equal(state.reviewed['기본정보'], false)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRegistrationReview, editRegistrationField, confirmRegistrationSection } from '../app/features/previews/registrationReview.ts'

test('editing collected data preserves original and invalidates only its section confirmation', () => {
  const state = createRegistrationReview()
  state.original['회사명'] = state.values['회사명'] = '수집 회사'
  confirmRegistrationSection(state, '기본정보', true)
  confirmRegistrationSection(state, '세무정보', true)
  assert.equal(editRegistrationField(state, '기본정보', '회사명', '수집 회사'), false)
  assert.equal(state.reviewed['기본정보'], true)
  editRegistrationField(state, '기본정보', '회사명', '수정 회사')
  assert.equal(state.original['회사명'], '수집 회사')
  assert.equal(state.reviewed['기본정보'], false)
  assert.equal(state.needsReview['기본정보'], true)
  assert.equal(state.reviewed['세무정보'], true)
  confirmRegistrationSection(state, '기본정보', true)
  assert.equal(state.needsReview['기본정보'], false)
})

test('empty input and review cancellation are supported without sharing state', () => {
  const first = createRegistrationReview()
  const second = createRegistrationReview()
  editRegistrationField(first, '기본설정', '직원 채용 여부', '없음')
  confirmRegistrationSection(first, '기본설정', true)
  editRegistrationField(first, '기본설정', '직원 채용 여부', '')
  assert.equal(first.reviewed['기본설정'], false)
  confirmRegistrationSection(first, '기본설정', false)
  assert.deepEqual(second, createRegistrationReview())
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isCorporationNumber, formatCorporationNumber } from '../app/utils/number-validation.ts'
import { isEmail, formatEmail } from '../app/utils/email-validation.ts'
import { partnerTableRow, partnerNumberIssues } from '../app/features/demo-partners/services/partnersApi.ts'
import { preparePartners } from '../app/features/demo-partners/services/partnerImport.ts'

test('corporation number validates 13 digits and formats six-seven groups', () => {
  for (const value of ['0123451234567', '012345-1234567']) {
    assert.equal(isCorporationNumber(value), true)
    assert.equal(formatCorporationNumber(value), '012345-1234567')
  }
  for (const value of ['012345123456', '01234512345678', '012-3451234567', 'abcdef1234567', 123451234567]) assert.equal(isCorporationNumber(value), false)
  assert.equal(isCorporationNumber(''), false)
  assert.equal(isCorporationNumber('', { required: false }), true)
  assert.equal(formatCorporationNumber('bad'), 'bad')
})

test('email validates typical addresses and preserves case when formatting', () => {
  for (const value of ['name@example.com', 'First.Last+tax@sub.example.co.kr', ' User@EXAMPLE.COM ']) assert.equal(isEmail(value), true)
  for (const value of ['a@@example.com', 'a@example', 'a b@example.com', '.a@example.com', 'a..b@example.com', 'a@-example.com', 'a@example..com', 'a@example.com\nother', `${'a'.repeat(65)}@example.com`, `a@${'b'.repeat(64)}.com`, 123]) assert.equal(isEmail(value), false)
  assert.equal(formatEmail(' User@EXAMPLE.COM '), 'User@EXAMPLE.COM')
  assert.equal(formatEmail(' bad email '), ' bad email ')
  for (const value of ['', null, undefined]) {
    assert.equal(isEmail(value), false)
    assert.equal(isEmail(value, { required: false }), true)
    assert.equal(formatEmail(value), '')
  }
})

test('table preserves corporation and email for template formatting; errors remain visible', () => {
  const source = preparePartners({ headers: [], unknown: [], rows: [{ line: 2, values: {
    registration: '1234567890', corporationNumber: '0123451234567', email: ' User@example.com ',
  }, errors: [], warnings: [] }] }, [])[0]!
  const original = structuredClone(source)
  const displayed = partnerTableRow(source)
  assert.equal(displayed.corporationNumber, '0123451234567')
  assert.equal(displayed.email, ' User@example.com ')
  assert.deepEqual(displayed.numberIssues, {})
  assert.deepEqual(source, original)
  const issues = partnerNumberIssues({ registration: '1234567890', corporationNumber: 'bad', email: 'bad@' })
  assert.ok(issues.corporationNumber)
  assert.ok(issues.email)
  assert.deepEqual(partnerNumberIssues({ registration: '1234567890' }), {})
})

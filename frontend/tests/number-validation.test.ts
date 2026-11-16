import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isBusinessNumber, isResidentNumber, isPhoneNumber, isMobileNumber, formatBusinessNumber, formatResidentNumber, formatPhoneNumber, formatMobileNumber } from '../app/utils/number-validation.ts'
import { partnerNumberIssues, partnerTableRow } from '../app/features/demo-partners/services/partnersApi.ts'
import { preparePartners } from '../app/features/demo-partners/services/partnerImport.ts'

test('display formatters add hyphens and preserve invalid or already formatted values', () => {
  assert.equal(formatBusinessNumber('1234567890'), '123-45-67890')
  assert.equal(formatResidentNumber('0001013000000'), '000101-3000000')
  assert.equal(formatMobileNumber('01025521549'), '010-2552-1549')
  for (const [input, expected] of [
    ['021234567', '02-123-4567'], ['0212345678', '02-1234-5678'],
    ['0311234567', '031-123-4567'], ['07012345678', '070-1234-5678'],
    ['15881234', '1588-1234'], ['01025521549', '010-2552-1549'],
    ['010-2552-1549', '010-2552-1549'], ['bad123', 'bad123'], ['010-25521549', '010-25521549'],
  ]) assert.equal(formatPhoneNumber(input), expected)
  assert.equal(formatPhoneNumber(null), '')
  assert.equal(formatMobileNumber(undefined), '')
  assert.equal(formatBusinessNumber(''), '')
})

test('table preserves raw values for template formatting', () => {
  const source = preparePartners({ headers: [], unknown: [], rows: [{ line: 2, values: {
    registration: '1234567890', phone: '0212345678', mobile: '01025521549',
  }, errors: [], warnings: [] }] }, [])[0]!
  const original = structuredClone(source)
  const displayed = partnerTableRow(source)
  assert.equal(displayed.registration, '1234567890')
  assert.equal(displayed.phone, '0212345678')
  assert.equal(displayed.mobile, '01025521549')
  assert.deepEqual(source, original)
  assert.deepEqual(displayed.numberIssues, {})
})

test('business numbers accept only full numeric or correctly hyphenated formats', () => {
  for (const value of ['1234567890', ' 123-45-67890 ']) assert.equal(isBusinessNumber(value), true)
  for (const value of ['123456789', '123-456-7890', '123 45 67890', '1234567890a', 1234567890]) assert.equal(isBusinessNumber(value), false)
})

test('resident format checks month, day range and domestic identifier prefix', () => {
  for (const value of ['0001013000000', '000101-3000000']) assert.equal(isResidentNumber(value), true)
  for (const value of ['001301-3000000', '000100-3000000', '000132-3000000', '000101-5000000', '000101-300000', '000101--3000000']) assert.equal(isResidentNumber(value), false)
  // Calendar validity is deliberately outside regex format validation.
  assert.equal(isResidentNumber('000231-3000000'), true)
})

test('phone formats support landline, mobile, internet and representative numbers', () => {
  for (const value of ['02-123-4567', '0212345678', '031-123-4567', '010-1234-5678', '07012345678', '1588-1234', '15881234']) assert.equal(isPhoneNumber(value), true)
  for (const value of ['1234', '+82-10-1234-5678', '02-12345678', '010 1234 5678', '010-1234-5678 내선 1']) assert.equal(isPhoneNumber(value), false)
  assert.equal(isMobileNumber('01012345678'), true)
  assert.equal(isMobileNumber('010-1234-5678'), true)
  assert.equal(isMobileNumber('02-1234-5678'), false)
})

test('empty inputs are required by default and optional only explicitly', () => {
  for (const validate of [isBusinessNumber, isResidentNumber, isPhoneNumber, isMobileNumber]) {
    for (const value of ['', ' ', null, undefined]) {
      assert.equal(validate(value), false)
      assert.equal(validate(value, { required: false }), true)
    }
    assert.equal(validate('abc', { required: false }), false)
  }
})

test('table issues preserve source values and allow omitted optional contacts', () => {
  assert.deepEqual(partnerNumberIssues({ registration: '123-45-67890' }), {})
  const information = { registration: 'bad', phone: '123', mobile: '02-1234-5678' }
  const original = { ...information }
  assert.deepEqual(Object.keys(partnerNumberIssues(information)), ['registration', 'phone', 'mobile'])
  assert.deepEqual(information, original)
})

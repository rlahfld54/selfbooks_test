import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMockAccounting } from '../app/features/accounts/mockAccounting.ts'
import { filterAccounts, validateAccount, validateSummary } from '../app/features/accounts/logic.ts'

test('fixtures have 40 accounts, all categories and both cash summary sides', () => {
  const { accounts, summaries } = createMockAccounting()
  assert.equal(accounts.length, 40)
  assert.equal(new Set(accounts.map((a) => a.category)).size, 5)
  assert.deepEqual(
    summaries.filter((s) => s.accountId === 101).map((s) => s.side),
    ['DEBIT', 'CREDIT'],
  )
  assert.ok(summaries.every((s) => accounts.some((a) => a.id === s.accountId)))
})
test('category, search and active filters combine without changing source', () => {
  const { accounts } = createMockAccounting()
  assert.deepEqual(
    filterAccounts(accounts, ' 101 ', '자산', '당좌자산', 'true').map((a) => a.name),
    ['현금'],
  )
  assert.equal(filterAccounts(accounts, '', '자산', '당좌자산', '').length, 10)
  assert.equal(filterAccounts(accounts, '없는계정', '', '', '').length, 0)
  assert.equal(filterAccounts(accounts, '104', '', '', 'true').length, 0)
  assert.equal(accounts.length, 40)
})
test('account UI validation accepts edits and rejects blank, duplicate and incompatible classifications', () => {
  const { accounts } = createMockAccounting()
  const account = { ...accounts[0]! }
  assert.equal(validateAccount({ ...account, name: '현금 수정' }, accounts), '')
  assert.match(validateAccount({ ...account, code: ' ' }, accounts), /입력/)
  assert.match(validateAccount({ ...account, code: '102' }, accounts), /사용 중/)
  assert.match(validateAccount({ ...account, category: '부채' }, accounts), /중분류/)
  assert.match(validateAccount({ ...account, category: 'unknown' }, accounts), /대분류/)
})
test('summary validation checks required fields, valid account and unique code', () => {
  const { accounts, summaries } = createMockAccounting()
  const summary = { ...summaries[0]! }
  assert.equal(validateSummary({ ...summary, name: '현금 수납' }, [], accounts), '')
  assert.match(validateSummary({ ...summary, name: ' ' }, summaries, accounts), /입력/)
  assert.match(validateSummary({ ...summary, accountId: -1 }, summaries, accounts), /연결/)
  assert.match(
    validateSummary({ ...summary, code: summaries[1]!.code }, summaries, accounts),
    /사용 중/,
  )
})
test('new fixture instances do not share edited values', () => {
  const first = createMockAccounting()
  first.accounts[0]!.name = '수정'
  first.summaries.splice(0, 1)
  const next = createMockAccounting()
  assert.equal(next.accounts[0]!.name, '현금')
  assert.equal(next.summaries.length, 80)
})

import {
  mapAccountDefaults,
  type AccountDefaultRecord,
} from '../app/features/accounts/accountDefaults.ts'
import { accountCategories } from '../app/features/accounts/types.ts'
const defaultRecord: AccountDefaultRecord = {
  sourceId: '9007199254740993',
  code: '101',
  name: '현금',
  englishName: null,
  categoryCode: '1',
  subcategory: '당좌자산',
  attribute: null,
  normalBalance: 'D',
  relatedAccount: null,
  statementCode: null,
  fxMethodCode: '0',
  businessCar: false,
  isActive: true,
  isLocked: false,
}
test('DB mapping preserves bigint identity, null fields and confirmed category names', () => {
  const [row] = mapAccountDefaults([defaultRecord])
  assert.equal(row!.sourceId, '9007199254740993')
  assert.equal(row!.category, '자산')
  assert.equal(row!.balanceSide, 'DEBIT')
  assert.equal(row!.englishName, '')
  assert.equal(row!.fxMethodCode, '0')
})
test('DB categories include special and source subcategories without dropping unknown codes', () => {
  const rows = mapAccountDefaults([
    { ...defaultRecord, categoryCode: 'SPECIAL', subcategory: '특수설정계정과목' },
    { ...defaultRecord, categoryCode: '3', subcategory: '자본조정', normalBalance: 'C' },
    { ...defaultRecord, categoryCode: 'NEW', subcategory: null },
  ])
  assert.deepEqual(accountCategories(rows)['특수설정계정과목'], ['특수설정계정과목'])
  assert.ok(accountCategories(rows)['자본']!.includes('자본조정'))
  assert.equal(rows[1]!.balanceSide, 'CREDIT')
  assert.equal(rows[2]!.category, 'NEW')
  assert.deepEqual(mapAccountDefaults([]), [])
})
test('unknown balance codes are rejected instead of silently mapped to credit', () => {
  assert.throws(
    () =>
      mapAccountDefaults([
        { ...defaultRecord, normalBalance: 'X' } as unknown as AccountDefaultRecord,
      ]),
    /성격/,
  )
})

import {
  mapClientSummaries,
  type ClientSummaryRecord,
} from '../app/features/accounts/clientSummaries.ts'
const summaryRecord: ClientSummaryRecord = {
  sourceId: '9007199254740993',
  code: '591',
  summaryNo: 1,
  name: '현금입금',
  typeCode: 'FIXED',
  transactionElementCode: 1,
  isActive: true,
  accountSourceId: '9007199254740994',
  accountDefaultId: '9007199254740993',
  accountCode: '101',
  accountName: '실제 현금',
}
test('client summary uses actual account name and reference transaction-element direction', () => {
  const defaults = mapAccountDefaults([defaultRecord])
  const mapped = mapClientSummaries([summaryRecord], defaults)
  assert.equal(mapped.summaries[0]!.sourceId, summaryRecord.sourceId)
  assert.equal(mapped.summaries[0]!.accountId, defaults[0]!.id)
  assert.equal(mapped.summaries[0]!.side, 'DEBIT')
  assert.equal(mapped.summaries[0]!.transactionElementCode, 1)
  assert.equal(mapped.accounts[0]!.name, '실제 현금')
})
test('custom accounts and null summary codes are retained without inventing defaults', () => {
  const mapped = mapClientSummaries([{ ...summaryRecord, accountDefaultId: null, code: null }], [])
  assert.equal(mapped.summaries.length, 1)
  assert.equal(mapped.summaries[0]!.code, '')
  assert.equal(mapped.summaries[0]!.accountId, mapped.accounts[0]!.id)
  assert.deepEqual(mapClientSummaries([], []), { accounts: [], summaries: [] })
})

import { summarySide } from '../app/features/accounts/types.ts'
import { classifyAccount } from '../app/features/accounts/classification.ts'
test('eight transaction elements map to debit/credit and unknown values remain unknown', () => {
  for (let n = 1; n <= 8; n++) assert.equal(summarySide(n), n <= 4 ? 'DEBIT' : 'CREDIT')
  assert.equal(summarySide(null, '상계체크카드-대변'), 'CREDIT')
  assert.equal(summarySide(99), 'UNKNOWN')
  assert.equal(summarySide(1.5), 'UNKNOWN')
})
test('fixed names and independent exclusion permissions are enforced', () => {
  const { accounts, summaries } = createMockAccounting()
  const fixed = { ...summaries[0]!, isFixed: true, canExclude: true }
  assert.match(validateSummary({ ...fixed, name: '변경' }, [fixed], accounts), /고정적요/)
  assert.equal(validateSummary({ ...fixed, excluded: true }, [fixed], accounts), '')
  const variable = { ...fixed, isFixed: false, canExclude: false }
  assert.match(validateSummary({ ...variable, excluded: true }, [variable], accounts), /조회제외/)
})
test('reference classification respects range boundaries and special accounts', () => {
  assert.equal(classifyAccount('145')?.mid, '당좌자산')
  assert.equal(classifyAccount('146')?.mid, '재고자산')
  assert.equal(classifyAccount('1000')?.mid, '특수설정계정과목')
  assert.equal(classifyAccount('1011'), undefined)
})

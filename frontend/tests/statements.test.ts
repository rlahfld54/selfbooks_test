import test from 'node:test'
import assert from 'node:assert/strict'
import { balanceSheet, formatAmount, incomeStatement, monthEnd, netIncome, trialBalance, type LedgerBalanceRow } from '../app/features/statements/statements.ts'

const account = (code: number, name: string, category: string, middle: string, debit: number, credit: number, nature = '일반'): LedgerBalanceRow => ({
  code, name, engName: '', category, middle, nature, normalBalance: '', openDebit: '0', openCredit: '0', debit: String(debit), credit: String(credit),
})

// 자본금 1,000 입금 · 상품 500 외상매입 · 상품매출 800 현금 · 소모품비 100 현금
const rows = [
  account(101, '현금', '1', '당좌자산', 1800, 100),
  account(146, '상품', '1', '재고자산', 500, 0),
  account(251, '외상매입금', '2', '유동부채', 0, 500),
  account(331, '자본금', '3', '자본금', 0, 1000),
  account(377, '미처분이익잉여금', '3', '이익잉여금', 0, 0),
  account(401, '상품매출', '4', '매출', 0, 800),
  account(830, '소모품비', '5', '판매비및일반관리비', 100, 0),
]

test('net income is revenue minus expenses', () => {
  assert.equal(netIncome(rows, 'period'), 700n)
})

test('balance sheet balances with net income in unappropriated retained earnings', () => {
  const sheet = balanceSheet(rows, null)
  assert.equal(sheet.balanced, true)
  assert.equal(sheet.diff, 0n)
  assert.equal(sheet.rows.find(r => r.key === 't-자산')?.values[1], 2200n)
  assert.equal(sheet.rows.find(r => r.key === 'a-377')?.values[1], 700n)
})

test('income statement sections and goods cost lines', () => {
  const sheet = incomeStatement(rows, null, false)
  assert.equal(sheet.netIncome, 700n)
  assert.equal(sheet.rows.find(r => r.key === 's-rev')?.values[1], 800n)
  assert.equal(sheet.rows.find(r => r.key === 's-tax')?.label, 'Ⅸ.소득세등')
  assert.equal(sheet.rows.find(r => r.key === 'g-close')?.values[0], 500n)
})

test('trial balance debit and credit totals match', () => {
  const sheet = trialBalance(rows)
  assert.equal(sheet.balanced, true)
  // 차변 잔액 2,300 · 차변 합계 2,400 · 대변 합계 2,400 · 대변 잔액 2,300
  assert.deepEqual(sheet.rows.at(-1)?.values, [2300n, 2400n, 2400n, 2300n])
})

test('contra accounts reduce the asset side', () => {
  const withContra = [...rows, account(109, '대손충당금', '1', '당좌자산', 0, 50, '차감'), account(835, '대손상각비', '5', '판매비및일반관리비', 50, 0)]
  const sheet = balanceSheet(withContra, null)
  assert.equal(sheet.balanced, true)
  assert.equal(sheet.rows.find(r => r.key === 'a-109')?.values[1], -50n)
})

test('format and month end helpers', () => {
  assert.equal(formatAmount(1099909091n), '1,099,909,091')
  assert.equal(formatAmount(-499999n), '-499,999')
  assert.equal(formatAmount(null), '')
  assert.equal(monthEnd(2028, 2), '2028-02-29')
})

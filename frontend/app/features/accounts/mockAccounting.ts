import type { MockAccount, MockSummary } from './types.ts'

// UI fixtures only. Codes/classification are examples, not a statutory master.
const groups: [string, string, string, string][] = [
  ['자산', '당좌자산', '101,102,103,104,105,108,120,121,122,123', '현금,당좌예금,보통예금,제예금,정기예금,외상매출금,미수금,선급금,선급비용,단기대여금'],
  ['자산', '재고자산', '150,151,152', '상품,제품,원재료'],
  ['자산', '투자자산', '170,171', '장기금융상품,투자유가증권'],
  ['자산', '유형자산', '201,202,203,204', '토지,건물,차량운반구,비품'],
  ['자산', '무형자산', '220,221', '영업권,소프트웨어'],
  ['자산', '기타비유동자산', '230', '임차보증금'],
  ['부채', '유동부채', '251,252,253,254,255', '외상매입금,미지급금,예수금,부가세예수금,단기차입금'],
  ['부채', '비유동부채', '280,281', '장기차입금,퇴직급여충당부채'],
  ['자본', '', '301,302,303', '자본금,자본잉여금,이익잉여금'],
  ['수익', '', '401,402,403', '상품매출,제품매출,이자수익'],
  ['비용', '', '501,502,503,504,505', '상품매출원가,급여,임차료,통신비,소모품비'],
]
export function createMockAccounting() {
  const accounts: MockAccount[] = groups.flatMap(([category, subcategory, codes, names]) =>
    codes.split(',').map((code, index) => ({
      id: Number(code), code, name: names.split(',')[index]!, displayName: names.split(',')[index]!,
      category, subcategory, balanceSide: category === '자산' || category === '비용' ? 'DEBIT' as const : 'CREDIT' as const,
      isActive: !['104', '171', '281'].includes(code),
      englishName: code === '101' ? 'Cash' : '', statementCode: '', attribute: 'UI 예시',
      relatedAccount: '', foreignCurrency: false, businessCar: code === '203',
    })))
  const summaries: MockSummary[] = accounts.flatMap((account, index) => [
    { id: index * 2 + 1, accountId: account.id, code: 'D' + account.code, name: account.name + ' 차변 거래', side: 'DEBIT' as const, isFixed: index % 3 === 0, isActive: true },
    { id: index * 2 + 2, accountId: account.id, code: 'C' + account.code, name: account.name + ' 대변 거래', side: 'CREDIT' as const, isFixed: false, isActive: index % 5 !== 0 },
  ])
  return { accounts, summaries }
}

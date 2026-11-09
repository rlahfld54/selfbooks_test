export const voucherColumns = [
  { key: 'side', label: '구분', width: '80px' },
  { key: 'account', label: '계정과목', width: '180px' },
  { key: 'memo', label: '적요', width: '220px' },
  { key: 'debit', label: '차변 (원)', width: '160px', amount: true },
  { key: 'credit', label: '대변 (원)', width: '160px', amount: true },
]
export const voucherRows = [
  {
    id: '1',
    side: '차변',
    account: '매출채권',
    memo: '상품 매출 예시',
    debit: '1500000',
    credit: '0',
  },
  { id: '2', side: '대변', account: '매출', memo: '상품 매출 예시', debit: '0', credit: '1500000' },
]

export interface DemoRow { id: string; name: string; code: string; contact: string; status: string; amount: string; date: string }
export const partnerRows: DemoRow[] = [
  { id: '1001', code: '1001', name: '(주)행복상사', contact: '02-1234-5678', status: '거래 중', amount: '1500000', date: '2026-11-09' },
  { id: '1002', code: '1002', name: '(주)우리상사', contact: '02-2345-6789', status: '거래 중', amount: '2800000', date: '2026-11-08' },
  { id: '1003', code: '1003', name: '(주)미래산업', contact: '02-3456-7890', status: '확인요망', amount: '950000', date: '2026-11-07' },
  { id: '1004', code: '1004', name: '그린오피스', contact: '02-4567-8901', status: '거래 중', amount: '320000', date: '2026-11-06' },
  { id: '1005', code: '1005', name: '새봄디자인', contact: '02-5678-9012', status: '거래 중', amount: '1200000', date: '2026-11-05' },
  { id: '1006', code: '1006', name: '한빛유통', contact: '02-6789-0123', status: '거래 중', amount: '4600000', date: '2026-11-04' },
]
export function companyPartners(company: string) {
  return company === 'demo-happy' ? partnerRows.map(row => ({ ...row })) : partnerRows.slice(0, 3).map((row, index) => ({ ...row, id: 'B' + row.id, code: '200' + index, name: ['우리물류', '바른기획', '푸른상사'][index]!, amount: '750000' }))
}


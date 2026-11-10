import type { SalesMeta, SalesRecord } from './salesJournal.ts'

export const previewSalesJournal = {
  async metadata(): Promise<{ data: SalesMeta }> {
    return {
      data: {
        company: '샘플 회계회사',
        establishment: '미리보기 사업장',
        user: '미리보기',
        periods: [{ id: '2026', label: '2026년', start: '2026-01-01', end: '2026-12-31', status: 'open' }],
        accounts: [
          { id: 'cash', code: '101', name: '현금' },
          { id: 'sales', code: '401', name: '상품매출' },
          { id: 'vat', code: '255', name: '부가세예수금' },
        ],
        partners: [{ id: 'preview-partner', code: 'P001', name: '샘플 문구점' }],
      },
    }
  },
  async list(): Promise<{ data: SalesRecord[] }> {
    return {
      data: [{
        id: 'preview-sale',
        version: 1,
        date: '2026-11-10',
        periodId: '2026',
        partnerId: 'preview-partner',
        partner: '샘플 문구점',
        partnerCode: 'P001',
        type: '11',
        item: '사무용품',
        supply: '100000',
        vat: '10000',
        payment: '현금',
        memo: '공개 미리보기용 샘플 전표',
        zeroVatConfirmed: false,
        status: 'draft',
        entryNumber: 'DEMO-001',
        needsReview: false,
        lines: [
          { side: 'debit', account: 'cash', amount: '110000', memo: '' },
          { side: 'credit', account: 'sales', amount: '100000', memo: '' },
          { side: 'credit', account: 'vat', amount: '10000', memo: '' },
        ],
      }],
    }
  },
}

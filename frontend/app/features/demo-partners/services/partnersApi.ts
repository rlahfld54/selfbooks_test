import type { ImportedPartner } from './partnerImport.ts'

export type PartnersTransport = <T>(
  path: string,
  options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown> },
) => Promise<{ data: T }>
export function createPartnersService(request: PartnersTransport) {
  return {
    list: () => request<ImportedPartner[]>('/partners'),
    insert: (rows: ImportedPartner[], batchId: string) =>
      request<ImportedPartner[]>('/partners/import', {
        method: 'POST',
        body: {
          batchId,
          rows: rows.map((row) => ({
            sourceLine: row.sourceLine,
            information: row.information,
            importIssues: row.importIssues,
          })),
        },
      }),
  }
}

export const partnerColumns = [
  { key: 'registration', label: '사업자등록번호', width: '180px' },
  { key: 'businessType', label: '사업자 구분[1:개인, 2:법인]', width: '240px' },
  { key: 'corporationNumber', label: '법인등록번호', width: '180px' },
  { key: 'name', label: '업체명', width: '220px' },
  { key: 'representative', label: '대표자명', width: '160px' },
  { key: 'industryCode', label: '업종코드', width: '140px' },
  { key: 'businessCategory', label: '업태', width: '160px' },
  { key: 'industry', label: '업종', width: '180px' },
  { key: 'postalCode', label: '우편번호', width: '130px' },
  { key: 'address', label: '기본주소', width: '280px' },
  { key: 'addressDetail', label: '상세주소', width: '220px' },
  { key: 'contactName', label: '사용자명', width: '160px' },
  { key: 'phone', label: '사용자(담당자) 전화번호', width: '310px' },
  { key: 'email', label: '사용자(담당자) 개인이메일', width: '260px' },
  { key: 'mobile', label: '사용자(담당자) 휴대전화번호', width: '260px' },
]
export function partnerTableRow(row: ImportedPartner) {
  return {
    ...row,
    ...Object.fromEntries(
      partnerColumns.map((column) => [column.key, row.information[column.key] || '—']),
    ),
    id: row.id,
  }
}

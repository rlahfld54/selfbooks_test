import type { ImportedPartner } from './partnerImport.ts'
import { isCorporationNumber } from '../../../utils/number-validation.ts'
import { isEmail } from '../../../utils/email-validation.ts'
import { isBusinessNumber, isPhoneNumber, isMobileNumber } from '../../../utils/number-validation.ts'

export function partnerNumberIssues(information: Record<string, string>): Record<string, string> {
  const issues: Record<string, string> = {}
  if (!isCorporationNumber(information.corporationNumber, { required: false })) issues.corporationNumber = '법인등록번호 형식 확인 (숫자 13자리 또는 000000-0000000)'
  if (!isEmail(information.email, { required: false })) issues.email = '이메일 형식 확인 (예: name@example.com)'
  if (!isBusinessNumber(information.registration)) issues.registration = '사업자등록번호 형식 확인 (숫자 10자리 또는 000-00-00000)'
  if (!isPhoneNumber(information.phone, { required: false })) issues.phone = '전화번호 형식 확인 (예: 02-1234-5678, 010-1234-5678, 1588-1234)'
  if (!isMobileNumber(information.mobile, { required: false })) issues.mobile = '휴대전화번호 형식 확인 (010-0000-0000 또는 숫자 11자리)'
  return issues
}

/** 공통 테이블 슬롯의 unknown 값을 문자열 오류 메시지로 좁힌다. */
export function partnerCellIssue(row: Record<string, unknown>, key: string): string | undefined {
  const issues = row.numberIssues
  if (!issues || typeof issues !== 'object' || Array.isArray(issues)) return undefined
  if (!Object.prototype.hasOwnProperty.call(issues, key)) return undefined
  const message = (issues as Record<string, unknown>)[key]
  return typeof message === 'string' ? message : undefined
}

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
    numberIssues: partnerNumberIssues(row.information),
  }
}

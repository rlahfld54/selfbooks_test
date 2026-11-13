import type { RegistrationReview } from './registrationReview'

export type OfficeRegistration = Record<string, string | null>
export function applyOfficeRegistration(state: RegistrationReview, office: OfficeRegistration) {
  const fields: Record<string, string> = {
    회사명: 'name', 사업자등록번호: 'business_registration_number', 법인등록번호: 'corporate_registration_number',
    주소: 'address', 업태: 'business_type', 종목: 'business_item', 대표자명: 'representative_name',
    공동대표자: 'co_representatives', 연락처: 'representative_phone', 본점: 'head_office', 지점: 'branches',
    추가사업장: 'additional_workplaces', 과세유형: 'taxation_type', 관할세무서: 'jurisdiction_tax_office',
    담당자: 'tax_contact_name', 업무메모: 'business_memo',
  }
  const values = Object.fromEntries(Object.entries(fields).map(([label, column]) => [label, office[column] ?? '']))
  values['환급계좌'] = [office.refund_bank_name, office.refund_account_number, office.refund_account_holder].filter(Boolean).join(' / ')
  state.values = { ...values }
  state.original = { ...values }
  state.reviewed = Object.fromEntries(Object.entries({ 기본정보: 'basic_info_reviewed_at', 대표자정보: 'representative_info_reviewed_at',
    사업장정보: 'workplace_info_reviewed_at', 세무정보: 'tax_info_reviewed_at', '첨부/메모': 'memo_reviewed_at' })
    .map(([section, column]) => [section, Boolean(office[column])]))
  state.needsReview = {}
}

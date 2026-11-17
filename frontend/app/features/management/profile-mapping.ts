import { formatBusinessNumber, formatPhoneNumber } from '../../utils/number-validation.ts'
import { formatProfileField } from './profile-format.ts'
import type { Staff } from './data'
import type { ProfileUser, ProfileOffice } from './profile-service'

export function mapProfile(profile?: { user: ProfileUser; office: ProfileOffice }) {
  const user = profile?.user
  const office = profile?.office
  const person: Staff = {
    id: user?.id ?? '', name: formatProfileField('name', user?.name), email: formatProfileField('email', user?.email),
    login: user?.loginId ?? '', phone: formatProfileField('phone', user?.phone), team: user?.departmentName ?? '', title: user?.jobTitle ?? '', joined: user?.joinedAt ?? '',
    role: user ? (user.role === 'OWNER' ? '조직 소유자' : user.role === 'ADMIN' ? '조직 관리자' : user.role) : '',
    status: user ? '활성' : '',
  }
  const organization: Record<string, string> = {
    '회계법인명/사무소명': office?.name ?? '',
    '사업자등록번호': formatBusinessNumber(office?.business_registration_number),
    '대표자명': office?.representative_name ?? '',
    '대표전화': formatPhoneNumber(office?.representative_phone),
    '사업장 주소': office?.address ?? '',
    '대표 이메일': '',
  }
  return { person, organization }
}

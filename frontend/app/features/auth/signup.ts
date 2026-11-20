// 회원가입 절차 입력 검사 (셀프북스 초기화면 v1-1 기준)

export type VerifyMethod = 'phone' | 'ipin' | 'sms' | 'email'

export const VERIFY_LABEL: Record<VerifyMethod, string> = {
  phone: '본인명의 휴대전화 인증',
  ipin: '아이핀(I-Pin) 인증',
  sms: '문자 인증',
  email: '이메일 인증',
}

export interface SignupTerms {
  service: boolean
  privacy: boolean
  entrust: boolean
  marketing: boolean
}

export interface SignupInfo {
  loginId: string
  password: string
  confirmation: string
  phone: string
  email: string
}

// 필수 약관 3개 (마케팅은 선택)
export function requiredTermsAgreed(terms: SignupTerms) {
  return terms.service && terms.privacy && terms.entrust
}

export function loginIdError(loginId: string) {
  if (!loginId.trim()) return '필수입력 항목입니다.'
  if (!/^[A-Za-z0-9._]{5,20}$/.test(loginId.trim())) return '영문·숫자 5~20자로 입력하세요.'
  return ''
}

export function passwordError(password: string) {
  if (!password) return '필수입력 항목입니다.'
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return '영문과 숫자를 포함해 8자 이상 입력하세요.'
  return ''
}

export function confirmationError(password: string, confirmation: string) {
  if (!confirmation) return '필수입력 항목입니다.'
  if (password !== confirmation) return '비밀번호가 일치하지 않습니다.'
  return ''
}

export function emailError(email: string) {
  if (!email.trim()) return '필수입력 항목입니다.'
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return '이메일 형식을 확인하세요.'
  return ''
}

export function phoneError(phone: string) {
  if (!phone.trim()) return '필수입력 항목입니다.'
  if (!/^01\d-?\d{3,4}-?\d{4}$/.test(phone.trim())) return '휴대폰 번호를 확인하세요.'
  return ''
}

// 인증번호는 숫자 6자리 (데모: 아무 숫자나 통과)
export function validCode(code: string) {
  return /^\d{6}$/.test(code.trim())
}

// 회원정보 단계의 첫 번째 오류. 없으면 빈 문자열
export function infoError(info: SignupInfo, idChecked: boolean) {
  return loginIdError(info.loginId)
    || (idChecked ? '' : '아이디 중복확인을 해주세요.')
    || passwordError(info.password)
    || confirmationError(info.password, info.confirmation)
    || phoneError(info.phone)
    || emailError(info.email)
}

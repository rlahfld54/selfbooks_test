/** 형식 검사 전용. 발급 여부, 체크섬, 실제 생년월일은 검증하지 않는다. */
const patterns = {
  business: /^(?:[0-9]{10}|[0-9]{3}-[0-9]{2}-[0-9]{5})$/,
  corporation: /^[0-9]{6}-?[0-9]{7}$/,
  resident: /^[0-9]{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])-?[1-4][0-9]{6}$/,
  phone: /^(?:02[0-9]{7,8}|0[0-9]{2}[0-9]{7,8}|02-[0-9]{3,4}-[0-9]{4}|0[0-9]{2}-[0-9]{3,4}-[0-9]{4}|1[0-9]{7}|1[0-9]{3}-[0-9]{4})$/,
  mobile: /^(?:010[0-9]{8}|010-[0-9]{4}-[0-9]{4})$/,
} as const

export type NumberFormat = keyof typeof patterns
export interface NumberValidationOptions { required?: boolean }

/** 문자열만 허용하여 숫자 변환으로 인한 선행 0 유실을 방지한다. */
export function isValidNumberFormat(type: NumberFormat, value: unknown, options: NumberValidationOptions = {}): boolean {
  if (value === null || value === undefined) return options.required === false
  if (typeof value !== 'string') return false
  const text = value.trim()
  if (!text) return options.required === false
  return patterns[type].test(text)
}

export const isBusinessNumber = (value: unknown, options?: NumberValidationOptions) => isValidNumberFormat('business', value, options)
export const isCorporationNumber = (value: unknown, options?: NumberValidationOptions) => isValidNumberFormat('corporation', value, options)
export const isResidentNumber = (value: unknown, options?: NumberValidationOptions) => isValidNumberFormat('resident', value, options)
export const isPhoneNumber = (value: unknown, options?: NumberValidationOptions) => isValidNumberFormat('phone', value, options)
export const isMobileNumber = (value: unknown, options?: NumberValidationOptions) => isValidNumberFormat('mobile', value, options)

/** 표시 전용: 유효한 형식만 변환하며 잘못된 입력은 원문 그대로 반환한다. */
export function formatNumber(type: NumberFormat, value: string | null | undefined): string {
  if (value == null) return ''
  if (!isValidNumberFormat(type, value)) return value
  const text = value.trim()
  if (text.includes('-')) return text
  if (type === 'business') return text.replace(/^([0-9]{3})([0-9]{2})([0-9]{5})$/, '$1-$2-$3')
  if (type === 'resident' || type === 'corporation') return text.replace(/^([0-9]{6})([0-9]{7})$/, '$1-$2')
  if (text.length === 8) return `${text.slice(0, 4)}-${text.slice(4)}`
  const prefixLength = text.startsWith('02') && text.length <= 10 ? 2 : 3
  return `${text.slice(0, prefixLength)}-${text.slice(prefixLength, -4)}-${text.slice(-4)}`
}

export const formatBusinessNumber = (value: string | null | undefined) => formatNumber('business', value)
export const formatCorporationNumber = (value: string | null | undefined) => formatNumber('corporation', value)
export const formatResidentNumber = (value: string | null | undefined) => formatNumber('resident', value)
export const formatPhoneNumber = (value: string | null | undefined) => formatNumber('phone', value)
export const formatMobileNumber = (value: string | null | undefined) => formatNumber('mobile', value)

/** 일반적인 ASCII 이메일 형식 검사. 따옴표 주소·국제화 주소·도메인 리터럴은 지원하지 않는다. */
const emailPattern = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/

export function isEmail(value: unknown, options: { required?: boolean } = {}): boolean {
  if (value == null) return options.required === false
  if (typeof value !== 'string') return false
  const text = value.trim()
  if (!text) return options.required === false
  if (text.length > 254 || !emailPattern.test(text)) return false
  const [local, domain] = text.split('@')
  return local!.length <= 64 && domain!.split('.').every(label => label.length <= 63)
}

/** 대소문자를 보존하고 유효한 주소의 앞뒤 공백만 제거한다. 오류 입력은 원문을 유지한다. */
export function formatEmail(value: string | null | undefined): string {
  if (value == null) return ''
  return isEmail(value) ? value.trim() : value
}

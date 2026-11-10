import type { MockAccount, MockUser, RegisterInput } from './types'

export const normalizeEmail = (email: string) => email.trim().toLowerCase()
export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
export function validateRegistration(input: RegisterInput): string {
  if (!input.name.trim()) return '이름을 입력해 주세요.'
  if (!validEmail(input.email)) return '올바른 이메일 주소를 입력해 주세요.'
  if (input.password.length < 8 || !/[a-zA-Z]/.test(input.password) || !/\d/.test(input.password) || !/[^a-zA-Z0-9\s]/.test(input.password)) {
    return '비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해 주세요.'
  }
  if (input.password !== input.confirmation) return '비밀번호가 일치하지 않습니다.'
  if (!input.accepted) return '필수 약관에 동의해 주세요.'
  return ''
}
export function isMockUser(value: unknown): value is MockUser {
  if (!value || typeof value !== 'object') return false
  const u = value as MockUser
  return typeof u.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(u.id)
    && typeof u.name === 'string' && typeof u.email === 'string' && validEmail(u.email)
}
export function isMockAccount(value: unknown): value is MockAccount {
  if (!isMockUser(value)) return false
  const a = value as MockAccount
  return typeof a.salt === 'string' && /^[a-f0-9]{32}$/.test(a.salt)
    && typeof a.verifier === 'string' && /^[a-f0-9]{64}$/.test(a.verifier)
}

// A comparison value for a UI demo only; this is not a password storage/authentication system.
export async function mockVerifier(password: string, salt: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`))
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
}

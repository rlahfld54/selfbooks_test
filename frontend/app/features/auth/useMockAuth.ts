import { onMounted } from 'vue'
import type { MockAccount, MockUser, RegisterInput } from './types'
import { AUTH_KEYS, demoAccount } from './mocks'
import { isMockAccount, isMockUser, mockVerifier, normalizeEmail, validEmail, validateRegistration } from './validation'

export function useMockAuth() {
  const user = useState<MockUser | null>('mock-auth-user', () => null)
  const accounts = useState<MockAccount[]>('mock-auth-accounts', () => [])
  const ready = useState('mock-auth-ready', () => false)
  const warning = useState('mock-auth-warning', () => '')
  const registrationNotice = useState('mock-registration-notice', () => '')
  const registeredEmail = useState('mock-registered-email', () => '')

  function restore() {
    if (ready.value) return
    ready.value = true
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(AUTH_KEYS.accounts) || '[]')
      if (Array.isArray(raw)) accounts.value = raw.filter(isMockAccount)
      const session: unknown = JSON.parse(sessionStorage.getItem(AUTH_KEYS.session) || localStorage.getItem(AUTH_KEYS.session) || 'null')
      if (isMockUser(session)) user.value = { id: session.id, name: session.name, email: session.email }
    } catch {
      warning.value = '브라우저의 데모 상태를 읽을 수 없습니다. 현재 화면에서 다시 시작할 수 있습니다.'
    }
  }
  onMounted(restore)

  async function register(input: RegisterInput) {
    restore()
    const error = validateRegistration(input)
    if (error) return error
    const email = normalizeEmail(input.email)
    if (email === demoAccount.email || accounts.value.some(a => a.email === email)) return '이미 등록된 데모 이메일입니다. 로그인해 주세요.'
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
    const account: MockAccount = {
      id: crypto.randomUUID(), name: input.name.trim(), email,
      salt, verifier: await mockVerifier(input.password, salt),
    }
    accounts.value.push(account)
    try { localStorage.setItem(AUTH_KEYS.accounts, JSON.stringify(accounts.value)) }
    catch { warning.value = '저장소를 사용할 수 없어 데모 계정은 새로고침 전까지만 유지됩니다.' }
    registeredEmail.value = email
    registrationNotice.value = '데모 회원가입이 완료되었습니다. 입력한 계정으로 로그인해 주세요.'
    return ''
  }

  async function login(email: string, password: string, remember: boolean) {
    restore()
    if (!validEmail(email) || !password) return '이메일과 비밀번호를 확인해 주세요.'
    const normalized = normalizeEmail(email)
    let matched: MockUser | undefined
    if (normalized === demoAccount.email && password === demoAccount.password) matched = demoAccount
    else {
      const account = accounts.value.find(a => a.email === normalized)
      if (account && await mockVerifier(password, account.salt) === account.verifier) matched = account
    }
    if (!matched) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    user.value = { id: matched.id, name: matched.name, email: matched.email }
    try {
      localStorage.removeItem(AUTH_KEYS.session)
      sessionStorage.removeItem(AUTH_KEYS.session)
      ;(remember ? localStorage : sessionStorage).setItem(AUTH_KEYS.session, JSON.stringify(user.value))
    } catch { warning.value = '로그인 상태를 저장할 수 없어 새로고침 시 해제될 수 있습니다.' }
    registrationNotice.value = ''
    return ''
  }

  function logout() {
    user.value = null
    for (const storage of [localStorage, sessionStorage]) {
      try { storage.removeItem(AUTH_KEYS.session) }
      catch { warning.value = '저장된 데모 로그인 상태를 지우지 못했습니다. 브라우저 저장소를 확인해 주세요.' }
    }
  }
  return { user, warning, registeredEmail, registrationNotice, restore, login, register, logout }
}

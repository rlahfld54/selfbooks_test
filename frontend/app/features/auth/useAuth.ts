interface AuthUser { id: string; name: string; email: string; officeId: string; role: string }
export type SocialProvider = 'kakao' | 'custom:naver' | 'google'

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const warning = useState('auth-warning', () => '')
  const { $authClient } = useNuxtApp()
  const { apiBase } = useRuntimeConfig().public
  const router = useRouter()

  async function headers(): Promise<Record<string, string>> {
    if (!$authClient) return {}
    const { data, error } = await $authClient.auth.getSession()
    if (error || !data.session) { user.value = null; return {} }
    return { Authorization: `Bearer ${data.session.access_token}` }
  }
  async function restore() {
    if (!import.meta.client) return
    const authHeaders = await headers()
    if (!authHeaders.Authorization) { user.value = null; return }
    try {
      const result = await $fetch<{ data: AuthUser }>('/auth/me', { baseURL: apiBase, headers: authHeaders, retry: 0, timeout: 10000 })
      user.value = result.data
      warning.value = ''
    } catch (error) {
      user.value = null
      warning.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message || '서버 연결을 확인한 뒤 다시 로그인해 주세요.'
    }
  }
  async function login(email: string, password: string, remember: boolean) {
    if (!$authClient) return 'Supabase 연결 설정을 확인해 주세요.'
    warning.value = ''
    localStorage.setItem('selfbooks:remember', String(remember))
    const { error } = await $authClient.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return error.code === 'email_not_confirmed' ? '이메일 인증을 완료해 주세요.' : '이메일 또는 비밀번호를 확인해 주세요. 연결 상태도 확인해 주세요.'
    return verifyAccess()
  }

  async function verifyAccess() {
    await restore()
    if (user.value) return ''
    await $authClient?.auth.signOut({ scope: 'local' })
    return warning.value || '계정의 업무 접근 권한을 확인해 주세요.'
  }

  async function startSocialAuth(provider: SocialProvider, remember?: boolean) {
    if (!$authClient) return 'Supabase 연결 설정을 확인해 주세요.'
    const redirectTo = new URL(router.resolve('/auth/callback').href, window.location.origin).href
    const credentials = { provider, options: { redirectTo } }
    if (remember !== undefined) {
      localStorage.setItem('selfbooks:remember', String(remember))
      const { error } = await $authClient.auth.signInWithOAuth(credentials)
      return error ? '간편 로그인을 시작하지 못했습니다. 다시 시도해 주세요.' : ''
    }
    if (!user.value) return '계정을 연결하려면 먼저 로그인해 주세요.'
    const { error } = await $authClient.auth.linkIdentity(credentials)
    if (error?.code === 'identity_already_exists') return '이미 연결된 SNS 계정입니다.'
    return error ? 'SNS 계정을 연결하지 못했습니다. 계정 연결 설정을 확인해 주세요.' : ''
  }

  async function finishSocialAuth(code: string) {
    if (!$authClient) return 'Supabase 연결 설정을 확인해 주세요.'
    warning.value = ''
    const { error } = await $authClient.auth.exchangeCodeForSession(code)
    if (error) return '인증 요청이 만료됐거나 유효하지 않습니다. 다시 시도해 주세요.'
    return verifyAccess()
  }
  async function logout() {
    const result = await $authClient?.auth.signOut({ scope: 'local' })
    user.value = null
    warning.value = result?.error ? '로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.' : ''
  }
  return { user, warning, headers, restore, login, logout, startSocialAuth, finishSocialAuth }
}

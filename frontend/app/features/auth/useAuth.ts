import type { NuxtApp } from '#app'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/authStore'
import type { AuthUser } from './user'
import { createPasswordLoginService } from './password-login'
import { ApiRequestError, createApiClient } from '~/services/api-client'

export type SocialProvider = 'kakao' | 'custom:naver' | 'google'
const restores = new WeakMap<NuxtApp, { revision: number; promise: Promise<void> }>()

export function useAuth() {
  const { user } = storeToRefs(useAuthStore())
  const warning = useState('auth-warning', () => '')
  const restoreIssue = useState('auth-restore-issue', () => '')
  const verifying = useState('auth-verifying', () => false)
  const revision = useState('auth-revision', () => 0)
  const nuxtApp = useNuxtApp()
  const { $authClient } = nuxtApp
  const { apiBase, pagesPreview } = useRuntimeConfig().public
  const router = useRouter()

  async function headers(): Promise<Record<string, string>> {
    if (!$authClient) return {}
    const { data, error } = await $authClient.auth.getSession()
    if (error) throw error
    if (!data.session) return {}
    return { Authorization: `Bearer ${data.session.access_token}` }
  }
  async function checkAccess(started: number) {
    try {
      const authHeaders = await headers()
      if (started !== revision.value) return
      if (!authHeaders.Authorization) {
        user.value = null
        restoreIssue.value = ''
        return
      }
      const request = createApiClient(
        (path, options) => $fetch(path, { ...options, headers: authHeaders }),
        apiBase, 'same-origin', 10000,
      )
      const result = await request<AuthUser>('/auth/me')
      if (started !== revision.value) return
      user.value = result.data
      restoreIssue.value = ''
      warning.value = ''
    } catch (error) {
      if (started !== revision.value) return
      if (error instanceof ApiRequestError && error.status === 401) {
        warning.value = error.message
        restoreIssue.value = ''
        user.value = null
        await $authClient?.auth.signOut({ scope: 'local' }).catch(() => undefined)
        return
      }
      restoreIssue.value = error instanceof ApiRequestError && error.status === 403
        ? error.message
        : '로그인 상태를 확인하지 못했습니다. 서버 연결을 확인한 뒤 다시 시도해 주세요.'
      user.value = null
    }
  }
  function restore() {
    if (!import.meta.client || pagesPreview) return
    const started = revision.value
    const pending = restores.get(nuxtApp)
    if (pending?.revision === started) return pending.promise
    verifying.value = true
    const promise = checkAccess(started).finally(() => {
      if (restores.get(nuxtApp)?.promise !== promise) return
      restores.delete(nuxtApp)
      verifying.value = false
    })
    restores.set(nuxtApp, { revision: started, promise })
    return promise
  }

  async function expireSession(authorization: string | undefined, started: number) {
    if (!import.meta.client || started !== revision.value) return
    const current = await headers().catch(() => null)
    if (!current || (current.Authorization && current.Authorization !== authorization) || started !== revision.value) return
    revision.value++
    user.value = null
    restoreIssue.value = ''
    warning.value = '로그인이 만료되었습니다. 다시 로그인해 주세요.'
    try { await $authClient?.auth.signOut({ scope: 'local' }) }
    finally { await router.replace('/login') }
  }
  async function login(identifier: string, password: string, remember: boolean) {
    if (!$authClient || pagesPreview) return 'Supabase 연결 설정을 확인해 주세요.'
    warning.value = ''
    localStorage.setItem('selfbooks:remember', String(remember))
    const request = createApiClient((path, options) => $fetch(path, options), apiBase, 'same-origin', 20000)
    try {
      const { data } = await createPasswordLoginService(request)(identifier, password)
      const { error } = await $authClient.auth.setSession(data)
      if (error) return '로그인 세션을 저장하지 못했습니다. 다시 시도해 주세요.'
      return verifyAccess()
    } catch (error) {
      return error instanceof ApiRequestError ? error.message : '로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.'
    }
  }
  async function verifyAccess() {
    revision.value++
    user.value = null
    await restore()
    if (user.value) return ''
    return restoreIssue.value || warning.value || '계정의 업무 접근 권한을 확인해 주세요.'
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
    revision.value++
    restoreIssue.value = ''
    user.value = null
    const result = await $authClient?.auth.signOut({ scope: 'local' })
    warning.value = result?.error ? '로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.' : ''
  }
  return { user, warning, restoreIssue, verifying, revision, headers, restore, expireSession, login, logout, startSocialAuth, finishSocialAuth }
}

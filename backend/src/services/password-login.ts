import type { Pool } from 'pg'
import { AuthError, type AuthContext } from './auth.js'

export interface LoginTokens { access_token: string; refresh_token: string }
export type PasswordLogin = (identifier: string, password: string) => Promise<LoginTokens>
const invalid = () => new AuthError(401, 'INVALID_CREDENTIALS', '아이디 또는 이메일과 비밀번호를 확인해 주세요.')

export function createPasswordLogin(
  pool: Pool, url: string, key: string,
  authenticate: (authorization?: string) => Promise<AuthContext>,
  transport: typeof fetch = fetch,
): PasswordLogin {
  return async (identifier, password) => {
    const value = identifier.trim()
    if (!value || value.length > 254 || !password || password.length > 4096) throw invalid()
    const result = await pool.query<{ id: string; email: string }>(`
      SELECT id, email FROM public.users
      WHERE (login_id = $1 OR lower(email) = lower($1))
        AND status = 'ACTIVE' AND deleted_at IS NULL
        AND (locked_until IS NULL OR locked_until <= now())
      LIMIT 2`, [value])
    // Never choose an arbitrary account when an ID conflicts with an email.
    const account = result.rows[0]
    if (result.rows.length !== 1 || !account?.email) throw invalid()
    let response: Response
    let session: { access_token?: unknown; refresh_token?: unknown; user?: { id?: unknown } }
    try {
      response = await transport(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password }),
        signal: AbortSignal.timeout(7000),
      })
      if (response.status === 429) throw new AuthError(429, 'LOGIN_RATE_LIMITED', '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.')
      if (response.status >= 400 && response.status < 500) throw invalid()
      if (!response.ok) throw new Error('Authentication unavailable')
      session = await response.json() as typeof session
      if (!session || typeof session.access_token !== 'string' || !session.access_token ||
          typeof session.refresh_token !== 'string' || !session.refresh_token) throw new Error('Invalid auth response')
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError(503, 'AUTH_UNAVAILABLE', '인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    if (session.user?.id !== account.id) throw invalid()
    const verified = await authenticate(`Bearer ${session.access_token}`)
    if (verified.id !== account.id) throw invalid()
    return { access_token: session.access_token as string, refresh_token: session.refresh_token as string }
  }
}

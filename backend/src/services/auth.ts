import type { Pool } from 'pg'

export interface AuthContext { id: string; name: string; email: string; officeId: string; role: string }
export class AuthError extends Error {
  constructor(public statusCode: number, public code: string, message: string) { super(message) }
}

export function createAuthenticator(pool: Pool, officeId: string, url: string, key: string, transport: typeof fetch = fetch) {
  return async (authorization?: string): Promise<AuthContext> => {
    if (!authorization || !/^Bearer \S+$/.test(authorization)) throw new AuthError(401, 'UNAUTHENTICATED', '로그인이 필요합니다.')
    let response: Response
    try {
      response = await transport(`${url}/auth/v1/user`, {
        headers: { apikey: key, Authorization: authorization }, signal: AbortSignal.timeout(7000),
      })
    } catch { throw new AuthError(503, 'AUTH_UNAVAILABLE', '인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.') }
    if (response.status === 401 || response.status === 403) throw new AuthError(401, 'UNAUTHENTICATED', '로그인이 만료되었습니다. 다시 로그인해 주세요.')
    if (!response.ok) throw new AuthError(503, 'AUTH_UNAVAILABLE', '인증 서버 응답을 확인할 수 없습니다.')
    const identity = await response.json() as { id?: string }
    if (!identity.id || !/^[0-9a-f-]{36}$/i.test(identity.id)) throw new AuthError(401, 'UNAUTHENTICATED', '인증 정보를 확인할 수 없습니다.')
    const result = await pool.query<AuthContext>(`
      SELECT u.id, u.name, u.email, m.office_id AS "officeId", m.role
      FROM public.users u JOIN public.office_members m ON m.user_id = u.id
      WHERE u.id = $1 AND m.office_id = $2 AND u.status = 'ACTIVE'
        AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until <= now())
        AND m.status = 'ACTIVE' AND m.role IN ('OWNER', 'ADMIN')`, [identity.id, officeId])
    const user = result.rows[0]
    if (!user) throw new AuthError(403, 'ACCESS_DENIED', '활성 관리자 계정과 사무소 소속 등록을 확인해 주세요.')
    return user
  }
}

import type { Pool } from 'pg'

export interface AuthContext { id: string; name: string; email: string; officeId: string; role: string; userCode?: string | null; loginId?: string | null; phone?: string | null; departmentName?: string | null; jobTitle?: string | null; joinedAt?: string | null; profile?: Record<string, string | number | null> }
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
      SELECT u.id, u.name, u.email, m.office_id AS "officeId", m.role,
        u.user_code AS "userCode", u.login_id AS "loginId",
        COALESCE(NULLIF(u.mobile_phone, ''), u.phone) AS phone,
        m.department_name AS "departmentName", m.job_title AS "jobTitle",
        m.joined_at AS "joinedAt",
        json_build_object(
          'id', u.id, 'login_id', u.login_id, 'name', u.name, 'email', u.email,
          'phone', u.phone, 'status', u.status,
          'email_verified_at', u.email_verified_at, 'last_login_at', u.last_login_at,
          'password_changed_at', u.password_changed_at,
          'failed_login_count', u.failed_login_count, 'locked_until', u.locked_until,
          'created_at', u.created_at, 'updated_at', u.updated_at,
          'deleted_at', u.deleted_at, 'user_code', u.user_code,
          'mobile_phone', u.mobile_phone
        ) AS profile
      FROM public.users u JOIN public.office_members m ON m.user_id = u.id
      WHERE u.id = $1 AND m.office_id = $2 AND u.status = 'ACTIVE'
        AND u.deleted_at IS NULL AND (u.locked_until IS NULL OR u.locked_until <= now())
        AND m.status = 'ACTIVE' AND m.role IN ('OWNER', 'ADMIN')`, [identity.id, officeId])
    const user = result.rows[0]
    if (!user) throw new AuthError(403, 'ACCESS_DENIED', '활성 관리자 계정과 사무소 소속 등록을 확인해 주세요.')
    return user
  }
}

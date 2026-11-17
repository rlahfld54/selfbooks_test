import type { createApiClient } from '../../services/api-client'

export function createPasswordLoginService(request: ReturnType<typeof createApiClient>) {
  return (identifier: string, password: string) => request<{ access_token: string; refresh_token: string }>(
    '/auth/login', { method: 'POST', body: { identifier: identifier.trim(), password } },
  )
}

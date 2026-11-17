import type { FastifyInstance } from 'fastify'
import { AuthError } from '../services/auth.js'
import type { PasswordLogin } from '../services/password-login.js'

export function passwordLoginRoutes(app: FastifyInstance, login?: PasswordLogin) {
  // This server accepts loopback traffic only; one bounded budget per instance.
  let windowStart = Date.now()
  let attempts = 0
  app.post<{ Body: { identifier: string; password: string } }>('/api/auth/login', {
    bodyLimit: 32768,
    schema: { body: {
      type: 'object', additionalProperties: false, required: ['identifier', 'password'],
      properties: {
        identifier: { type: 'string', minLength: 1, maxLength: 254 },
        password: { type: 'string', minLength: 1, maxLength: 4096 },
      },
    } },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); attempts = 0 }
    if (++attempts > 30) {
      reply.header('Retry-After', '60')
      throw new AuthError(429, 'LOGIN_RATE_LIMITED', '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.')
    }
    if (!login) throw new AuthError(503, 'AUTH_UNAVAILABLE', '서버 인증 설정을 확인해 주세요.')
    return { data: await login(request.body.identifier, request.body.password) }
  })
}

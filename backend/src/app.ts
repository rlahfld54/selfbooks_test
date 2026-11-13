import Fastify from 'fastify'
import type { Pool } from 'pg'
import { localAccess } from './plugins/local-access.js'
import { healthRoutes } from './routes/health.js'
import { directoryRoutes } from './routes/directory.js'
import { createDirectory, DirectoryUnavailable, type FixtureScope } from './services/directory.js'
import { salesRoutes } from './routes/sales.js'
import { createSalesRepository } from './services/sales-repository.js'
import { createSalesContext } from './services/sales-context.js'
import { SalesError } from './services/sales-validation.js'
import { createOfficeRegistration } from './services/office-registration.js'
import { AuthError, type AuthContext } from './services/auth.js'

declare module 'fastify' { interface FastifyRequest { auth: AuthContext | null } }

export function buildApp(options: { frontendOrigin: string; pool?: Pool; fixtures?: FixtureScope; logger?: boolean; salesDevelopment?: boolean; authenticate?: (authorization?: string) => Promise<AuthContext> }) {
  const app = Fastify({ logger: options.logger ?? false, trustProxy: false })
  const { pool } = options
  if (pool) {
    pool.on('error', (error: NodeJS.ErrnoException) => {
      app.log.warn({ code: error.code }, 'Idle database connection failed')
    })
    app.addHook('onClose', () => pool.end())
  }

  app.setNotFoundHandler(async (_request, reply) =>
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  )
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AuthError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
    if (error instanceof SalesError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
    if (error instanceof Error && 'code' in error && error.code === '23505') return reply.code(409).send({ error: { code: 'DUPLICATE', message: '이미 저장된 전표입니다. 다시 조회해 주세요.' } })
    if (error instanceof DirectoryUnavailable) {
      return reply.code(503).send({ error: { code: 'DIRECTORY_UNAVAILABLE', message: 'Development directory unavailable' } })
    }
    const status = error instanceof Error && 'statusCode' in error ? error.statusCode : undefined
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return reply.code(status).send({ error: { code: 'INVALID_REQUEST', message: 'Invalid request' } })
    }
    request.log.error({ code: error instanceof Error && 'code' in error ? error.code : undefined }, 'Request failed')
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Request failed' } })
  })

  app.register(async (local) => {
    await localAccess(local, options.frontendOrigin)
    await healthRoutes(local, pool ? () => pool.query('SELECT 1') : undefined)
    local.decorateRequest('auth', null)
    local.addHook('preHandler', async (request) => {
      if (request.method === 'OPTIONS' || request.url.split('?')[0] === '/api/health') return
      if (!options.authenticate) throw new AuthError(503, 'AUTH_UNAVAILABLE', '서버 인증 설정을 확인해 주세요.')
      request.auth = await options.authenticate(request.headers.authorization)
    })
    local.get('/api/auth/me', async (request) => ({ data: request.auth }))
    const officeRegistration = pool && options.fixtures && options.salesDevelopment && process.env.NODE_ENV !== 'production'
      ? createOfficeRegistration(pool, options.fixtures.officeId) : undefined
    local.get('/api/office-registration', async (_request, reply) => {
      if (!officeRegistration) return reply.code(503).send({ error: { code: 'OFFICE_UNAVAILABLE', message: '사무소 조회 설정을 확인해 주세요.' } })
      const data = await officeRegistration()
      if (!data) return reply.code(404).send({ error: { code: 'OFFICE_NOT_FOUND', message: '서버에 설정된 사무소가 없습니다.' } })
      return { data }
    })
    await directoryRoutes(local, pool && options.fixtures ? createDirectory(pool, options.fixtures) : undefined)
    const context = options.fixtures ? createSalesContext(options.fixtures) : undefined
    await salesRoutes(local, pool && context && options.salesDevelopment && process.env.NODE_ENV !== 'production'
      ? (request) => createSalesRepository(pool, { ...context, userId: request.auth!.id }) : undefined)
  })
  return app
}

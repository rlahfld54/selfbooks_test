import Fastify from 'fastify'
import type { Pool } from 'pg'
import { localAccess } from './plugins/local-access.js'
import { healthRoutes } from './routes/health.js'
import { directoryRoutes } from './routes/directory.js'
import { createDirectory, DirectoryUnavailable, type FixtureScope } from './services/directory.js'

export function buildApp(options: { frontendOrigin: string; pool?: Pool; fixtures?: FixtureScope; logger?: boolean }) {
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
    await directoryRoutes(local, pool && options.fixtures ? createDirectory(pool, options.fixtures) : undefined)
  })
  return app
}

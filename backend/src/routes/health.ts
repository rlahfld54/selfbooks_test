import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance, checkDb?: () => Promise<unknown>) {
  app.get('/api/health', async () => ({ data: { status: 'ok' } }))
  app.get('/api/health/db', async (request, reply) => {
    try {
      if (!checkDb) throw new Error('Database not configured')
      await checkDb()
      return { data: { status: 'ok' } }
    } catch (error) {
      request.log.warn({ code: (error as NodeJS.ErrnoException).code }, 'Database health check failed')
      return reply.code(503).send({
        error: { code: 'DB_UNAVAILABLE', message: 'Database unavailable' },
      })
    }
  })
}

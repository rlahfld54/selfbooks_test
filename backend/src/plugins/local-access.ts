import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

export async function localAccess(app: FastifyInstance, frontendOrigin: string) {
  const origin = new URL(frontendOrigin)
  if (!['localhost', '127.0.0.1'].includes(origin.hostname) ||
      origin.protocol !== 'http:' || origin.origin !== frontendOrigin) {
    throw new Error('FRONTEND_ORIGIN must be an HTTP loopback origin')
  }

  app.addHook('onRequest', async (request, reply) => {
    const localHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(request.headers.host ?? '')
    if (!localHost || request.ip !== '127.0.0.1' ||
        (request.headers.origin !== undefined && request.headers.origin !== frontendOrigin) ||
        request.headers['sec-fetch-site'] === 'cross-site') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Local requests only' } })
    }
    reply.header('Cache-Control', 'no-store')
  })

  app.addHook('onRequest', async (request, reply) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
        (request.headers.origin !== frontendOrigin || !request.headers['content-type']?.startsWith('application/json'))) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Same-origin JSON requests required' } })
    }
  })
  await app.register(cors, { origin: frontendOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'] })
}

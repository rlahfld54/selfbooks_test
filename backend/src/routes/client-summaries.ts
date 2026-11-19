import type { FastifyInstance } from 'fastify'
import { AuthError } from '../services/auth.js'
import type { createClientSummaries } from '../services/client-summaries.js'
export async function clientSummaryRoutes(app: FastifyInstance, read?: ReturnType<typeof createClientSummaries>) {
  app.get('/api/account-summaries', async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    if (!request.auth) throw new AuthError(401, 'UNAUTHENTICATED', '로그인이 필요합니다.')
    if (!read) return reply.code(503).send({ error: { code: 'SUMMARIES_UNAVAILABLE', message: '적요 조회 설정을 확인해 주세요.' } })
    try { return { data: await read(request.auth.officeId) } }
    catch (error) {
      if (error instanceof AuthError) throw error
      return reply.code(503).send({ error: { code: 'SUMMARIES_UNAVAILABLE', message: '적요를 불러오지 못했습니다. 다시 시도해 주세요.' } })
    }
  })
}

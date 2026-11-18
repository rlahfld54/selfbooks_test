import type { FastifyInstance } from 'fastify'
import type { createAccountDefaults } from '../services/account-defaults.js'

export async function accountDefaultsRoutes(app: FastifyInstance, read?: ReturnType<typeof createAccountDefaults>) {
  app.get('/api/account-defaults', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
    if (!read) return reply.code(503).send({ error: { code: 'ACCOUNTS_UNAVAILABLE', message: '기본 계정과목 조회 설정을 확인해 주세요.' } })
    try { return { data: await read() } }
    catch { return reply.code(503).send({ error: { code: 'ACCOUNTS_UNAVAILABLE', message: '기본 계정과목을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' } }) }
  })
}

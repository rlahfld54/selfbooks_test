import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { PartnersRepository } from '../services/partners-repository.js'
import { validatePartnerImport } from '../services/partners-validation.js'
import { SalesError } from '../services/sales-validation.js'

export async function partnersRoutes(app: FastifyInstance, factory?: (request: FastifyRequest) => PartnersRepository) {
  function repository(request: FastifyRequest) {
    if (!factory) throw new SalesError(503, 'PARTNERS_UNAVAILABLE', '거래처 DB 연결 및 서버 사무소 설정을 확인하세요.')
    return factory(request)
  }
  app.get('/api/partners', async request => ({ data: await repository(request).list() }))
  app.post('/api/partners/import', { bodyLimit: 10 * 1024 * 1024 }, async request => {
    const input = validatePartnerImport(request.body)
    return { data: await repository(request).insert(input) }
  })
}

import type { FastifyInstance, FastifyRequest } from 'fastify'
import { uuidPattern } from '../config/env.js'
import { validateAccount, validateStart, type createCollectionRepository } from '../services/collection-repository.js'
import { SalesError } from '../services/sales-validation.js'

type Repository = ReturnType<typeof createCollectionRepository>

/*
 * 자료수집 현황 `/api/collection/*` — 계약은 docs/collection.md.
 * 응답은 { data }. 사무소 범위는 서버가 인증 정보로 정하고, 보낸 업체 ID 는 사무소 업체와 대조한다.
 */
const uuid = new RegExp(uuidPattern)
const id = (value: unknown, label = 'ID') => {
  if (typeof value !== 'string' || !uuid.test(value)) throw new SalesError(400, 'INVALID_REQUEST', label + '를 확인해 주세요.')
  return value
}

export async function collectionRoutes(app: FastifyInstance, factory?: (request: FastifyRequest) => Repository) {
  function repository(request: FastifyRequest) {
    if (!factory) throw new SalesError(503, 'COLLECTION_UNAVAILABLE', 'DB 연결 및 서버 사무소 설정을 확인하세요.')
    return factory(request)
  }
  type Query = { clientId?: string, from?: string, to?: string }
  type Params = { id?: string, itemId?: string }

  app.get('/api/collection/status', async request => ({ data: await repository(request).status() }))
  app.get<{ Querystring: Query }>('/api/collection/rows', async (request) => {
    const repo = repository(request)
    return { data: await repo.rows(id(request.query.clientId, '사업체'), String(request.query.from ?? ''), String(request.query.to ?? '')) }
  })
  app.get<{ Querystring: Query }>('/api/collection/history', async (request) => {
    const repo = repository(request)
    return { data: await repo.history(id(request.query.clientId, '사업체')) }
  })
  app.put<{ Params: Params }>('/api/collection/clients/:id/hometax', async (request) => {
    const repo = repository(request)
    return { data: await repo.saveAccount(id(request.params.id, '사업체'), validateAccount(request.body)) }
  })
  app.post('/api/collection/runs', async (request) => {
    const repo = repository(request)
    return { data: await repo.start(validateStart(request.body)) }
  })
  app.get<{ Params: Params }>('/api/collection/runs/:id', async (request) => {
    const repo = repository(request)
    return { data: await repo.run(id(request.params.id, '작업')) }
  })
  app.post<{ Params: Params }>('/api/collection/runs/:id/cancel', async (request) => {
    const repo = repository(request)
    return { data: await repo.cancel(id(request.params.id, '작업')) }
  })
  app.post<{ Params: Params }>('/api/collection/runs/:id/items/:itemId/retry', async (request) => {
    const repo = repository(request)
    return { data: await repo.retry(id(request.params.id, '작업'), id(request.params.itemId, '작업')) }
  })
}

import type { FastifyInstance, FastifyRequest } from 'fastify'
import { COLLECTION_NOT_READY, type createCollectionRepository } from '../services/collection-repository.js'
import { SalesError } from '../services/sales-validation.js'

type Repository = ReturnType<typeof createCollectionRepository>

/*
 * 자료수집 현황 `/api/collection/*` — 계약은 docs/collection.md.
 * 지금은 수임 사업체 목록만 DB 에서 읽고, 수집 자료 · 이력은 테이블이 생기기 전이라 빈 목록이다.
 */
export async function collectionRoutes(app: FastifyInstance, factory?: (request: FastifyRequest) => Repository) {
  function repository(request: FastifyRequest) {
    if (!factory) throw new SalesError(503, 'COLLECTION_UNAVAILABLE', 'DB 연결 및 서버 사무소 설정을 확인하세요.')
    return factory(request)
  }
  const notReady = () => { throw new SalesError(503, 'COLLECTION_NOT_READY', COLLECTION_NOT_READY) }

  app.get('/api/collection/status', async request => ({ data: await repository(request).status() }))
  app.get('/api/collection/rows', async (request) => {
    repository(request)
    return { data: [] }
  })
  app.get('/api/collection/history', async (request) => {
    repository(request)
    return { data: [] }
  })
  app.post('/api/collection/runs', async (request) => {
    repository(request)
    return notReady()
  })
  app.get('/api/collection/runs/:id', async (request) => {
    repository(request)
    return notReady()
  })
  app.post('/api/collection/runs/:id/cancel', async (request) => {
    repository(request)
    return notReady()
  })
  app.post('/api/collection/runs/:id/items/:itemId/retry', async (request) => {
    repository(request)
    return notReady()
  })
}

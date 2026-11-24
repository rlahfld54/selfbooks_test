import type { FastifyInstance, FastifyRequest } from 'fastify'
import { uuidPattern } from '../config/env.js'
import { validateRange, type createLedgerRepository } from '../services/ledger-repository.js'
import { SalesError } from '../services/sales-validation.js'

type Repository = ReturnType<typeof createLedgerRepository>

// 재무제표 집계 `/api/ledger/*` — 사무소 범위는 서버가 인증 정보로 정한다
const uuid = new RegExp(uuidPattern)

export async function ledgerRoutes(app: FastifyInstance, factory?: (request: FastifyRequest) => Repository) {
  function repository(request: FastifyRequest) {
    if (!factory) throw new SalesError(503, 'LEDGER_UNAVAILABLE', 'DB 연결 및 서버 사무소 설정을 확인하세요.')
    return factory(request)
  }

  type Query = { clientId?: string, from?: string, to?: string }

  app.get<{ Querystring: Query }>('/api/ledger/balances', async (request) => {
    const { clientId, from, to } = request.query
    if (clientId !== undefined && clientId !== '' && !uuid.test(clientId)) {
      throw new SalesError(400, 'INVALID_REQUEST', '사업체 ID를 확인해 주세요.')
    }
    const range = validateRange(from, to)
    return { data: await repository(request).balances(clientId || undefined, range.from, range.to) }
  })
}

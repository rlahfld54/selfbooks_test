import type { FastifyInstance } from 'fastify'
import { uuidPattern } from '../config/env.js'
import { DirectoryUnavailable, type createDirectory } from '../services/directory.js'

export async function directoryRoutes(app: FastifyInstance, directory?: ReturnType<typeof createDirectory>) {
  function configured() {
    if (!directory) throw new DirectoryUnavailable()
    return directory
  }

  app.get('/api/clients', async () => ({ data: await configured().clients() }))
  app.get<{ Params: { id: string } }>('/api/clients/:id', {
    schema: { params: {
      type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: uuidPattern } },
    } },
  }, async (request, reply) => {
    const client = await configured().client(request.params.id)
    if (!client) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Client not found' } })
    }
    return { data: client }
  })
  app.get('/api/tax-offices', async () => ({ data: await configured().taxOffices() }))
}

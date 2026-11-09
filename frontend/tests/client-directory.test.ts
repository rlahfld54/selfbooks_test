import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient, ApiRequestError } from '../app/services/api-client.ts'
import { createClientDirectoryService } from '../app/features/client-directory/services/clientDirectory.ts'

test('directory service uses the injected API for list and encoded detail paths', async () => {
  const calls: string[] = []
  const controller = new AbortController()
  const record = { id: 'sample', officeId: 'office', name: '업체', taxpayerKind: 'demo', status: 'active' }
  const request = createApiClient(async <T>(path: string, options: { signal?: AbortSignal }) => {
    calls.push(path)
    assert.equal(options.signal, controller.signal)
    return { data: path === '/clients' ? [record] : record } as T
  }, 'http://localhost:4000/api')
  const service = createClientDirectoryService(request)
  assert.deepEqual(await service.list(controller.signal), { data: [record] })
  assert.deepEqual(await service.get('id/with?reserved', controller.signal), { data: record })
  assert.deepEqual(calls, ['/clients', '/clients/id%2Fwith%3Freserved'])
})

test('directory service preserves API failures and cancellation reasons', async () => {
  const service = createClientDirectoryService(createApiClient(async () => {
    throw { status: 404, data: { error: { code: 'NOT_FOUND', message: 'Missing' } } }
  }, 'http://localhost:4000/api'))
  await assert.rejects(service.get('missing'), (error: unknown) =>
    error instanceof ApiRequestError && error.status === 404 && error.code === 'NOT_FOUND')
  const controller = new AbortController()
  const reason = new Error('Page left')
  controller.abort(reason)
  await assert.rejects(service.list(controller.signal), error => error === reason)
})

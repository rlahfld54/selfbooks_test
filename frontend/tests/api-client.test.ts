import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ApiRequestError, createApiClient } from '../app/services/api-client.ts'

test('the transport receives the configured base URL, credentials policy and abort signal', async () => {
  const { signal } = new AbortController()
  const request = createApiClient(async <T>(path: string, options: Parameters<Parameters<typeof createApiClient>[0]>[1]) => {
    assert.equal(path, '/clients')
    assert.equal(options.baseURL, 'http://localhost:4000/api')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.signal, signal)
    return { data: [{ id: 'sample' }] } as T
  }, 'http://localhost:4000/api')
  assert.deepEqual(await request<{ id: string }[]>('/clients', signal), { data: [{ id: 'sample' }] })
})

test('HTTP failures retain backend status and code; aborts retain their original reason', async () => {
  const request = createApiClient(async () => {
    throw { status: 503, data: { error: { code: 'DIRECTORY_UNAVAILABLE', message: 'Unavailable' } } }
  }, 'http://localhost:4000/api')
  await assert.rejects(request('/clients'), (error: unknown) =>
    error instanceof ApiRequestError && error.status === 503 && error.code === 'DIRECTORY_UNAVAILABLE',
  )
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(request('/clients', controller.signal), { name: 'AbortError' })
})

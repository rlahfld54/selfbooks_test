import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient, ApiRequestError } from '../app/services/api-client.ts'
import { createProfileService } from '../app/features/management/profile-service.ts'

test('profile loads authenticated user and matching office without client-supplied IDs', async () => {
  const calls: string[] = []
  const signal = new AbortController().signal
  const user = { id: 'user', officeId: 'office', name: '관리자', email: 'test@example.test', role: 'ADMIN' }
  const office = { id: 'office', name: '사무소' }
  const service = createProfileService(createApiClient(async <T>(path: string, options: { signal?: AbortSignal }) => {
    calls.push(path)
    assert.equal(options.signal, signal)
    return { data: path === '/auth/me' ? user : office } as T
  }, 'http://localhost:4000/api'))
  assert.deepEqual(await service.load(signal), { user, office })
  assert.deepEqual(calls, ['/auth/me', '/office-registration'])
})

test('profile rejects mismatched office data', async () => {
  const service = createProfileService(createApiClient(async <T>(path: string) => ({
    data: path === '/auth/me' ? { officeId: 'allowed' } : { id: 'other' },
  }) as T, 'http://localhost:4000/api'))
  await assert.rejects(service.load(), /소속 조직/)
})

test('profile propagates authorization and server failures without sample fallback', async () => {
  for (const status of [401, 403, 503]) {
    const service = createProfileService(createApiClient(async () => { throw { status } }, 'http://localhost:4000/api'))
    await assert.rejects(service.load(), error => error instanceof ApiRequestError && error.status === status)
  }
})

test('cancelled profile requests do not reach the transport', async () => {
  const service = createProfileService(createApiClient(async () => { assert.fail('Unexpected request') }, 'http://localhost:4000/api'))
  const signal = AbortSignal.abort(new Error('Page left'))
  await assert.rejects(service.load(signal), error => error === signal.reason)
})

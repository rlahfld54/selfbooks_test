import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient, ApiRequestError } from '../app/services/api-client.ts'
import { createPasswordLoginService } from '../app/features/auth/password-login.ts'

test('password login sends IDs and emails in POST body with no password normalization', async () => {
  for (const identifier of ['onegi', 'test@example.test']) {
    const request = createApiClient(async <T>(path: string, options: { method?: string; body?: object }) => {
      assert.equal(path, '/auth/login')
      assert.equal(options.method, 'POST')
      assert.deepEqual(options.body, { identifier, password: ' secret ' })
      return { data: { access_token: 'access', refresh_token: 'refresh' } } as T
    }, 'http://localhost:4000/api')
    assert.deepEqual(await createPasswordLoginService(request)(' ' + identifier + ' ', ' secret '), { data: { access_token: 'access', refresh_token: 'refresh' } })
  }
})

test('login propagates credential, permission, rate-limit and connection errors', async () => {
  for (const status of [401, 403, 429, 503]) {
    const request = createApiClient(async () => { throw { status, data: { error: { message: 'Login failed' } } } }, 'http://localhost:4000/api')
    await assert.rejects(createPasswordLoginService(request)('onegi', 'secret'), error => error instanceof ApiRequestError && error.status === status && error.message === 'Login failed')
  }
})

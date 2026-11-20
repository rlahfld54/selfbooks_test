import assert from 'node:assert/strict'
import test from 'node:test'
import { createProfileService } from '../app/features/management/profile-service.ts'
import { createApiClient } from '../app/services/api-client.ts'

const user = { id: 'user', officeId: 'office', name: '사용자', email: 'user@example.test', role: 'ADMIN' }
const office = { id: 'office', name: '사무소', business_registration_number: null, representative_name: null, representative_phone: null, address: null }

test('login profile loads user and organization together with the same cancellation signal', async () => {
  const paths: string[] = []
  const controller = new AbortController()
  const request = createApiClient(async <T>(path: string, options: { signal?: AbortSignal }) => {
    paths.push(path)
    assert.equal(options.signal, controller.signal)
    return { data: path === '/auth/me' ? user : office } as T
  }, '/api')
  assert.deepEqual(await createProfileService(request).load(controller.signal), { user, office })
  assert.deepEqual(paths, ['/auth/me', '/office-registration'])
})

test('a different organization cannot become the login profile', async () => {
  const request = createApiClient(async <T>(path: string) =>
    ({ data: path === '/auth/me' ? user : { ...office, id: 'another-office' } }) as T, '/api')
  await assert.rejects(createProfileService(request).load(), /소속 조직/)
})

test('failure of either request rejects the complete login profile', async () => {
  for (const failedPath of ['/auth/me', '/office-registration']) {
    const request = createApiClient(async <T>(path: string) => {
      if (path === failedPath) throw new Error('unavailable')
      return { data: path === '/auth/me' ? user : office } as T
    }, '/api')
    await assert.rejects(createProfileService(request).load(), /서버에 연결하지 못했습니다/)
  }
})

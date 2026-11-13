export const testUser = { id: 'demo-admin', email: 'test@example.test', name: 'Test', officeId: 'test-office', role: 'ADMIN' }
export function testSession() {
  const expires_at = Math.floor(Date.now() / 1000) + 3600
  const access_token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: testUser.id, exp: expires_at })).toString('base64url'), 'test-signature'].join('.')
  return { access_token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at, user: { ...testUser, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }
}
export async function mockAuthenticatedContext(context) {
  await context.addInitScript((session) => { localStorage.setItem('selfbooks:auth', JSON.stringify(session)); localStorage.setItem('selfbooks:remember', 'true') }, testSession())
  await context.route('**/api/auth/me', route => route.fulfill({ json: { data: testUser } }))
}

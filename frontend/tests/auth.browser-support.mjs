export const testUser = { id: 'demo-admin', email: 'test@example.test', name: 'Test', officeId: 'test-office', role: 'ADMIN' }
export const testOffice = { id: testUser.officeId, name: '테스트 사무소', business_registration_number: null, representative_name: null, representative_phone: null, address: null }
export const testAuthUser = { ...testUser, organization: testOffice, membership: { id: 'membership', office_id: testUser.officeId, user_id: testUser.id, role: 'ADMIN', status: 'ACTIVE', department_name: null, job_title: null, joined_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } }
export function testClientStatus(records = []) {
  return { companies: [], sample: false, assignedClients: [], clients: records.map(record => ({
    ...record, office_id: record.officeId, client_name: record.name, taxpayer_kind: record.taxpayerKind,
  })) }
}
export function testSession() {
  const expires_at = Math.floor(Date.now() / 1000) + 3600
  const access_token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: testUser.id, exp: expires_at })).toString('base64url'), 'test-signature'].join('.')
  return { access_token, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at, user: { ...testUser, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }
}
export async function mockAuthenticatedContext(context) {
  await context.addInitScript((session) => { localStorage.setItem('selfbooks:auth', JSON.stringify(session)); localStorage.setItem('selfbooks:remember', 'true') }, testSession())
  await context.route('**/api/office-registration', route => route.fulfill({ json: { data: testOffice } }))
  await context.route('**/api/collection/status', route => route.fulfill({ json: { data: testClientStatus() } }))
  await context.route('**/api/auth/me', route => route.fulfill({ json: { data: testAuthUser } }))
}

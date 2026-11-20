import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { useAuthStore } from '../app/stores/authStore.ts'
import type { AuthUser } from '../app/features/auth/user.ts'

test('user ref exists before login and stays synchronized with nested state', () => {
  const store = useAuthStore(createPinia())
  const { user } = storeToRefs(store)
  assert.ok(user)
  assert.equal(user.value, null)

  const account = { id: 'uuid', name: '사용자', email: 'user@example.test', officeId: 'office', role: 'ADMIN' }
  store.state.user = account
  assert.equal(user.value, store.state.user)
  assert.equal(store.isLoggedIn, true)

  user.value = null
  assert.equal(store.state.user, null)
  assert.equal(store.userInfo, null)
  assert.equal(store.isAdmin, false)

  user.value = account
  assert.equal(store.state.user, user.value)
  store.clear()
  assert.equal(user.value, null)
  assert.equal(store.state.user, null)
})

test('authenticated identity is shared through store refs and cleared on logout', () => {
  setActivePinia(createPinia())
  const store = useAuthStore()
  const { user } = storeToRefs(store)
  store.setUser({ id: 'uuid', name: '사용자', email: 'user@example.test', officeId: 'office', role: 'OWNER' })
  assert.equal(user.value?.id, 'uuid')
  assert.equal(store.isLoggedIn, true)
  assert.equal(store.isAdmin, true)
  user.value = { ...user.value!, role: 'STAFF' }
  assert.equal(store.isAdmin, false)
  store.clear()
  assert.equal(user.value, null)
  assert.equal(store.isLoggedIn, false)
  assert.equal(store.isAdmin, false)
})

test('separate app instances do not share authenticated users', () => {
  const first = useAuthStore(createPinia())
  const second = useAuthStore(createPinia())
  first.setUser({ id: 'uuid', name: '사용자', email: 'user@example.test', officeId: 'office', role: 'ADMIN' })
  assert.equal(second.user, null)
  assert.equal(second.isAdmin, false)
})

test('organization follows identity replacement and clearing without persisting stale data', () => {
  const store = useAuthStore(createPinia())
  const account = { id: 'first', name: '사용자', email: 'user@example.test', officeId: 'office', role: 'ADMIN' }
  store.setUser({ ...account, organization: { id: 'office', name: '사무소', business_registration_number: null, representative_name: null, representative_phone: null, address: null } })
  assert.equal(store.user?.organization?.name, '사무소')
  store.setUser({ ...account, id: 'second', officeId: 'another-office' })
  assert.equal(store.user?.organization, undefined)
  store.clear()
  assert.equal(store.user, null)
})

test('query field getters follow replacement and clear, including missing optional fields', () => {
  const store = useAuthStore(createPinia())
  const fields = ['id', 'name', 'email', 'officeId', 'role', 'userCode', 'loginId', 'phone', 'departmentName', 'jobTitle', 'joinedAt'] as const
  for (const field of fields) assert.equal(store[field], null)
  assert.equal(store.profile, null)

  const account: AuthUser = {
    id: 'user', name: '사용자', email: 'user@example.test', officeId: 'office', role: 'ADMIN',
    userCode: 'U001', loginId: 'login', phone: '01000000000', departmentName: '세무팀',
    jobTitle: '팀장', joinedAt: '2026-01-01T00:00:00Z',
  }
  store.setUser(account)
  for (const field of fields) assert.equal(store[field], account[field])
  store.setUser({ id: 'another', name: '다른 사용자', email: 'another@example.test', officeId: 'another-office', role: 'OWNER' })
  assert.equal(store.id, 'another')
  assert.equal(store.departmentName, null)
  assert.equal(store.joinedAt, null)
  store.clear()
  for (const field of fields) assert.equal(store[field], null)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { useAuthStore } from '../app/stores/authStore.ts'

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

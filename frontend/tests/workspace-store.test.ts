import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceStore, isDemoCompany } from '../app/features/workspace/stores/workspace.ts'
import { freshWorkspace, openTab } from '../app/utils/workspace.ts'
import { defineTabSession } from '../app/composables/useTabSession.ts'

test('workspace instances isolate company, dirty state and tab sessions', () => {
  const first = createWorkspaceStore('voucher')
  const second = createWorkspaceStore('voucher')
  const session = defineTabSession(() => ({ input: '' }))
  first.setDirty(first.activeTab.value)
  first.company.value = 'demo-woori'
  session(first.activeTab.value).input = 'private draft'
  assert.equal(second.company.value, 'demo-happy')
  assert.equal(second.hasDirtyTabs.value, false)
  assert.equal(session(second.activeTab.value).input, '')
  assert.notEqual(first.activeTab.value, second.activeTab.value)
})

test('initial restoration retains the current tab and its in-memory input', () => {
  const store = createWorkspaceStore('voucher')
  const original = store.activeTab.value
  store.setDirty(original)
  const snapshot = freshWorkspace()
  openTab(snapshot, 'voucher')
  snapshot.tabs[1]!.panelWidth = 440
  store.replace('demo-happy', snapshot, 'voucher', true)
  assert.equal(store.activeTab.value, original)
  assert.equal(original.dirty, true)
  assert.equal(original.panelWidth, 440)
  assert.equal(store.generation.value, 0)
})

test('company replacement releases the old tab identity and dirty state', () => {
  const store = createWorkspaceStore('voucher')
  const session = defineTabSession(() => ({ input: '' }))
  const original = store.activeTab.value
  session(original).input = 'old company'
  store.setDirty(original)
  store.replace('demo-woori', freshWorkspace(), 'voucher')
  assert.notEqual(store.activeTab.value, original)
  assert.equal(session(store.activeTab.value).input, '')
  assert.equal(store.hasDirtyTabs.value, false)
  assert.equal(store.generation.value, 1)
  assert.equal(store.company.value, 'demo-woori')
})

test('demo company validation rejects unknown values', () => {
  assert.equal(isDemoCompany('demo-happy'), true)
  for (const value of [null, undefined, '', 'unknown', {}, 1]) {
    assert.equal(isDemoCompany(value), false)
  }
})

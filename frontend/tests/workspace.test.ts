import { test } from 'node:test'
import assert from 'node:assert/strict'
import { closeDestination, closeTab, createTab, freshWorkspace, openTab, restoreWorkspace, serializeWorkspace, storageKey } from '../app/utils/workspace.ts'
import { menu, tabInfo } from '../app/utils/workspace-routes.ts'
import { formatAmount } from '../app/utils/formatAmount.ts'
import { defineTabSession } from '../app/composables/useTabSession.ts'
import { companyPartners } from '../app/features/demo-partners/services/mockPartners.ts'

test('home is permanent and route paths are unique', () => {
  const state = freshWorkspace()
  assert.equal(state.active, 'home')
  assert.equal(closeTab(state, 'home', true), false)
  assert.equal(new Set(menu.map(tab => tab.path)).size, menu.length)
  assert.equal(tabInfo('voucher').path, '/journal')
  assert.equal(tabInfo('partners').path, '/clients')
  assert.notEqual(tabInfo('partners').path, tabInfo('clients').path)
})

test('opening an existing tab preserves its session; closing and reopening resets it', () => {
  const session = defineTabSession(() => ({ draft: '', query: '' }))
  const state = freshWorkspace()
  openTab(state, 'voucher')
  const tab = state.tabs[1]!
  session(tab).draft = 'draft'
  session(tab).query = 'query'
  tab.panel = true
  openTab(state, 'partners')
  openTab(state, 'voucher')
  assert.equal(state.tabs.length, 3)
  assert.equal(state.active, 'voucher')
  assert.equal(session(state.tabs[1]!).draft, 'draft')
  assert.equal(session(tab).query, 'query')
  assert.equal(tab.panel, true)
  assert.equal(closeTab(state, 'voucher'), true)
  openTab(state, 'voucher')
  assert.equal(session(state.tabs[2]!).draft, '')
})

test('dirty active tab cannot close without discard and falls back to its left neighbor', () => {
  const state = freshWorkspace()
  openTab(state, 'voucher')
  openTab(state, 'partners')
  state.tabs[2]!.dirty = true
  assert.equal(closeDestination(state, 'partners'), 'voucher')
  assert.equal(closeTab(state, 'partners'), false)
  assert.equal(state.active, 'partners')
  assert.equal(closeTab(state, 'partners', true), true)
  assert.equal(state.active, 'voucher')
})

test('closing an inactive clean tab preserves active tab', () => {
  const state = freshWorkspace()
  openTab(state, 'voucher')
  openTab(state, 'partners')
  assert.equal(closeDestination(state, 'voucher'), undefined)
  assert.equal(closeTab(state, 'voucher'), true)
  assert.equal(state.active, 'partners')
  assert.equal(closeTab(state, 'reports'), false)
})

test('serialization allowlists only tab IDs, active tab and panel widths', () => {
  const state = freshWorkspace()
  openTab(state, 'voucher')
  Object.assign(state.tabs[1]!, { dirty: true, panel: true, panelWidth: 400, query: 'private', draft: 'private' })
  const raw = serializeWorkspace(state)
  assert.deepEqual(JSON.parse(raw), {
    version: 1, tabs: [{ id: 'home', panelWidth: 360 }, { id: 'voucher', panelWidth: 400 }], active: 'voucher',
  })
  const restored = restoreWorkspace(raw)
  assert.equal(restored.active, 'voucher')
  assert.deepEqual(restored.tabs[1], { ...createTab('voucher'), panelWidth: 400 })
})

test('corrupt, outdated and unexpected storage is safely ignored', () => {
  for (const raw of ['{oops', 'null', '42', '{"version":2,"tabs":[]}', '{"version":1,"tabs":null}']) {
    assert.deepEqual(restoreWorkspace(raw), freshWorkspace())
  }
})

test('restore validates IDs, deduplicates tabs, clamps width and active ID', () => {
  const state = restoreWorkspace(JSON.stringify({ version: 1, tabs: [null, { id: 'unknown' }, { id: 'voucher', panelWidth: 999 }, { id: 'voucher', panelWidth: 100 }, { id: 'partners', panelWidth: 'bad' }], active: 'unknown' }))
  assert.deepEqual(state.tabs.map(tab => tab.id), ['home', 'voucher', 'partners'])
  assert.equal(state.tabs[1]!.panelWidth, 320)
  assert.equal(state.tabs[2]!.panelWidth, 360)
  assert.equal(state.active, 'home')
})

test('company and user namespaces and sessions are isolated', () => {
  const keys = new Set([storageKey('a', 'x'), storageKey('a', 'y'), storageKey('b', 'x'), storageKey('a:x', 'y'), storageKey('a', 'x:y')])
  assert.equal(keys.size, 5)
  const session = defineTabSession(() => ({ draft: '' }))
  const original = freshWorkspace()
  openTab(original, 'voucher')
  session(original.tabs[1]!).draft = 'company-a'
  const reopened = restoreWorkspace(serializeWorkspace(original))
  assert.equal(session(reopened.tabs[1]!).draft, '')
})

test('sample records are distinct across company contexts', () => {
  const first = companyPartners('demo-happy'), second = companyPartners('demo-woori')
  assert.equal(first.some(a => second.some(b => a.id === b.id || a.name === b.name)), false)
  first[0]!.name = 'changed'
  assert.notEqual(companyPartners('demo-happy')[0]!.name, 'changed')
})

test('integer amount formatting does not lose precision', () => {
  assert.equal(formatAmount('900719925474099312345'), '900,719,925,474,099,312,345')
  assert.equal(formatAmount('-1500000'), '-1,500,000')
  assert.equal(formatAmount('0'), '0')
  assert.equal(formatAmount(''), '')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { closeTab, createTab, freshWorkspace, openTab, restoreWorkspace, serializeWorkspace, storageKey, formatAmount } from '../app/utils/workspace.ts'
import { companyPartners } from '../app/data/demo.ts'

test('home is the default, permanent tab', () => {
 const state = freshWorkspace()
 assert.equal(state.active, 'home')
 assert.equal(closeTab(state, 'home', true), false)
})
test('opening the same menu activates one existing tab', () => {
 const state = freshWorkspace()
 openTab(state, 'voucher'); openTab(state, 'partners'); openTab(state, 'voucher')
 assert.equal(state.tabs.length, 3)
 assert.equal(state.active, 'voucher')
})
test('draft, selection, search and detail panel survive tab switches', () => {
 const state = freshWorkspace()
 openTab(state, 'voucher')
 const tab = state.tabs[1]!
 tab.draft.memo = 'draft'; tab.dirty = true; tab.panel = true; tab.query = 'query'; tab.selected = '1001'
 openTab(state, 'partners'); openTab(state, 'voucher')
 assert.equal(state.tabs[1], tab)
 assert.equal(tab.draft.memo, 'draft')
 assert.equal(tab.panel, true)
 assert.equal(tab.query, 'query')
})
test('dirty tab cannot close without explicit discard', () => {
 const state = freshWorkspace()
 openTab(state, 'voucher'); state.tabs[1]!.dirty = true
 assert.equal(closeTab(state, 'voucher'), false)
 assert.equal(state.tabs.length, 2)
 assert.equal(closeTab(state, 'voucher', true), true)
 assert.equal(state.active, 'home')
})
test('closing an inactive clean tab preserves active tab', () => {
 const state = freshWorkspace()
 openTab(state, 'voucher'); openTab(state, 'partners')
 assert.equal(closeTab(state, 'voucher'), true)
 assert.equal(state.active, 'partners')
 assert.equal(closeTab(state, 'reports'), false)
})
test('serialization excludes drafts, dirty state, selected records and free-text queries', () => {
 const state = freshWorkspace(); openTab(state, 'voucher')
 Object.assign(state.tabs[1]!, { dirty: true, query: 'sensitive-query', selected: 'private-id', panel: true })
 state.tabs[1]!.draft.memo = 'private-draft'
 const raw = serializeWorkspace(state)
 for (const forbidden of ['private-draft', 'sensitive-query', 'private-id', 'dirty', 'draft', 'selected']) assert.equal(raw.includes(forbidden), false)
 const restored = restoreWorkspace(raw)
 assert.equal(restored.active, 'voucher')
 assert.equal(restored.tabs[1]!.dirty, false)
 assert.equal(restored.tabs[1]!.draft.memo, '')
 assert.equal(restored.tabs[1]!.panel, false)
})
test('corrupt, outdated and unexpected storage is safely ignored', () => {
 for (const raw of ['{oops', 'null', '42', '{"version":2,"tabs":[]}', '{"version":1,"tabs":null}']) assert.deepEqual(restoreWorkspace(raw), freshWorkspace())
})
test('restore validates IDs, deduplicates tabs, clamps width and active ID', () => {
 const state = restoreWorkspace(JSON.stringify({ version: 1, tabs: [null, { id: 'unknown' }, { id: 'voucher', panelWidth: 999 }, { id: 'voucher', panelWidth: 100 }, { id: 'partners', panelWidth: 'bad' }], active: 'unknown' }))
 assert.deepEqual(state.tabs.map(tab => tab.id), ['home', 'voucher', 'partners'])
 assert.equal(state.tabs[1]!.panelWidth, 320)
 assert.equal(state.tabs[2]!.panelWidth, 360)
 assert.equal(state.active, 'home')
})
test('company and user namespaces are isolated', () => {
 const keys = new Set([storageKey('a', 'x'), storageKey('a', 'y'), storageKey('b', 'x'), storageKey('a:x', 'y'), storageKey('a', 'x:y')])
 assert.equal(keys.size, 5)
 const first = freshWorkspace(); openTab(first, 'voucher'); first.tabs[1]!.draft.memo = 'company-a'
 const second = restoreWorkspace(null)
 assert.equal(second.tabs.length, 1)
 assert.equal(serializeWorkspace(first).includes('company-a'), false)
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
test('new tabs never share draft objects', () => {
 const a = createTab('voucher'), b = createTab('voucher')
 a.draft.memo = 'a'
 assert.equal(b.draft.memo, '')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu, workspaceMenuGroups } from '../app/utils/workspace-routes.ts'
import { freshWorkspace, openTab, serializeWorkspace, restoreWorkspace } from '../app/utils/workspace.ts'

test('business menu destinations exist and master data is separated from voucher work', () => {
  const ids = workspaceMenuGroups.flatMap(group => group.items.map(item => item.id))
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) assert.ok(menu.some(item => item.id === id))
  assert.deepEqual(workspaceMenuGroups[0].items.map(item => item.id), ['company', 'settings', 'accounts', 'partners', 'opening-balances'])
  assert.deepEqual(workspaceMenuGroups[1].items.map(item => item.id), ['voucher', 'sales-journal', 'ledger'])
})

test('new work tabs restore while invalid destinations cannot create tabs', () => {
  const state = freshWorkspace()
  openTab(state, 'company')
  openTab(state, 'accounts')
  assert.equal(restoreWorkspace(serializeWorkspace(state)).active, 'accounts')
  const restored = restoreWorkspace('{"version":1,"tabs":[{"id":"missing"},{"id":"collection"}],"active":"missing"}')
  assert.deepEqual(restored.tabs.map(tab => tab.id), ['home', 'collection'])
  assert.equal(restored.active, 'home')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia } from 'pinia'
import { reactive, toRefs } from 'vue'
import { useAccountStore } from '../app/stores/accountStore.ts'
import { useSummaryStore } from '../app/stores/summaryStore.ts'
import { useOrganizationStore } from '../app/stores/organizationStore.ts'
import { useStaffStore } from '../app/stores/staffStore.ts'
import { usePermissionStore } from '../app/stores/permissionStore.ts'
import { useBranchStore } from '../app/stores/branchStore.ts'

test('account and summary screen bindings update their respective stores and preserve a tab', () => {
  const pinia = createPinia()
  const tab = {}
  const accountStore = useAccountStore(pinia)
  const summaryStore = useSummaryStore(pinia)
  const accounts = accountStore.forScope(tab)
  const summaries = summaryStore.forScope(tab)
  const screen = reactive({ ...toRefs(accounts), ...toRefs(summaries) })
  screen.query = '현금'
  screen.summaryQuery = '매출'
  assert.equal(accountStore.state.query, '현금')
  assert.equal(summaryStore.state.summaryQuery, '매출')
  assert.equal(accountStore.forScope(tab), accounts)
  assert.equal(summaryStore.forScope(tab), summaries)
  assert.equal(accountStore.forScope({}).query, '')
  assert.equal(summaryStore.forScope({}).summaryQuery, '')
  assert.equal(accountStore.forScope(tab).query, '현금')
})

test('organization sections share a workspace but isolate different workspaces and app instances', () => {
  const pinia = createPinia()
  const first = {}
  const other = {}
  const organization = useOrganizationStore(pinia)
  const staff = useStaffStore(pinia)
  const branches = useBranchStore(pinia)
  organization.forScope(first)['대표자명'] = '변경한 대표'
  staff.forScope(first)[0]!.name = '변경한 직원'
  branches.forScope(first)[0]!.name = '변경한 본사'
  assert.equal(organization.forScope(first)['대표자명'], '변경한 대표')
  assert.equal(staff.forScope(first)[0]!.name, '변경한 직원')
  assert.equal(branches.forScope(first)[0]!.name, '변경한 본사')
  assert.notEqual(organization.forScope(other)['대표자명'], '변경한 대표')
  assert.notEqual(staff.forScope(other)[0]!.name, '변경한 직원')
  assert.notEqual(branches.forScope(other)[0]!.name, '변경한 본사')
  assert.notEqual(useStaffStore(createPinia()).forScope(first)[0]!.name, '변경한 직원')
})

test('permission store preserves the existing sample policy without granting server permissions', () => {
  const store = usePermissionStore(createPinia())
  const workspace = {}
  const data = store.forScope(workspace)
  assert.equal(data.sample, true)
  assert.equal(data.rows.length, 8)
  assert.equal(data.rows.find(row => row.id === 'staff')?.member, false)
  assert.equal(data.rows.find(row => row.id === 'voucher')?.member, true)
  data.rows[0]!.member = true
  assert.equal(store.forScope(workspace).rows[0]!.member, true)
  assert.equal(store.forScope({}).rows[0]!.member, false)
})

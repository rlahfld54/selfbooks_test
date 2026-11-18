import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { clients } from '../app/features/management/data.ts'
import { mockAuthenticatedContext, testUser } from './auth.browser-support.mjs'

// Run against the normal development server; API responses are mocked here.
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
const browser = await chromium.launch({ headless: true, executablePath: process.env.SELFBOOKS_BROWSER })
try {
  const context = await browser.newContext()
  await mockAuthenticatedContext(context)
  await context.route('**/api/clients', route => route.fulfill({ json: { data: clients.map(client => ({ id: client.id, officeId: testUser.officeId, name: client.name, taxpayerKind: client.type, status: 'active' })) } }))
  let profileFails = false
  await context.route('**/api/office-registration', route => route.fulfill(profileFails
    ? { status: 503, json: { message: '조회 실패' } }
    : { json: { data: { id: testUser.officeId, name: '테스트 사무소', business_registration_number: null,
      representative_name: null, representative_phone: null, address: null } } }))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  async function visit(path) {
    await page.goto(base + path)
    await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false)
  }

  // Child filter events, empty results, reset, and drawer selection.
  await visit('/client-directory')
  const clientRows = page.locator('.management-table tbody tr')
  await expect(clientRows).toHaveCount(5)
  await page.getByLabel('업체명·사업자등록번호 검색', { exact: true }).fill('없는업체')
  await expect(page.locator('.empty')).toContainText('검색 조건에 맞는 수임업체가 없습니다')
  await page.getByRole('button', { name: '↻ 초기화' }).click()
  await expect(clientRows).toHaveCount(5)
  await clientRows.first().click()
  await expect(page.locator('dialog.drawer')).toBeVisible()
  await page.locator('dialog.drawer').getByRole('button', { name: '닫기', exact: true }).click()

  await expect(page.getByRole('button', { name: '+ 수임업체 등록 · 준비 중', exact: true })).toBeDisabled()
  const modal = page.locator('dialog.management-dialog.modal')

  // Shared form actions: cancel discards edits, save updates organization data.
  await visit('/organization')
  const organizationName = page.locator('.org-header h2')
  const originalName = await organizationName.innerText()
  await page.getByRole('button', { name: '✎ 수정하기', exact: true }).click()
  await page.getByLabel('회계법인명/사무소명', { exact: true }).fill('취소할 조직')
  await page.locator('.form-footer').getByRole('button', { name: '취소' }).click()
  await expect(organizationName).toHaveText(originalName)
  await page.getByRole('button', { name: '✎ 수정하기', exact: true }).click()
  await page.getByLabel('회계법인명/사무소명', { exact: true }).fill('수정된 조직')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(organizationName).toContainText('수정된 조직')
  await page.getByRole('button', { name: '직원 관리', exact: true }).click()
  await page.getByLabel('이름, ID, 이메일 검색', { exact: true }).fill('없는직원')
  await expect(page.locator('.empty')).toHaveText('검색 조건에 해당하는 직원이 없습니다.')
  await page.getByLabel('이름, ID, 이메일 검색', { exact: true }).fill('')
  await page.locator('.management-table tbody tr').first().click()
  await expect(page.locator('dialog.drawer')).toBeVisible()

  // Profile error propagation, retry, field events, and shared save action.
  profileFails = true
  await visit('/mypage')
  const editProfile = page.getByRole('button', { name: '✎ 정보 수정', exact: true })
  await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toBeVisible()
  await expect(editProfile).toBeDisabled()
  profileFails = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(editProfile).toBeEnabled()
  await editProfile.click()
  await page.getByLabel('이름', { exact: true }).fill('')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.locator('.management-feedback')).toContainText('이름과 올바른 이메일')
  await page.getByLabel('이름', { exact: true }).fill('수정한 이름')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.getByLabel('이름', { exact: true })).toHaveValue('수정한 이름')
  await expect(page.getByLabel('이름', { exact: true })).toBeDisabled()
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}

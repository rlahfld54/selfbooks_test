import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { clients } from '../app/features/management/data.ts'
import { mockAuthenticatedContext, testUser, testAuthUser, testClientStatus } from './auth.browser-support.mjs'

// Run against the normal development server; API responses are mocked here.
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
const browser = await chromium.launch({ headless: true, executablePath: process.env.SELFBOOKS_BROWSER })
try {
  const context = await browser.newContext()
  await mockAuthenticatedContext(context)
  await context.route('**/api/collection/status', route => route.fulfill({ json: { data: testClientStatus(clients.map(client => ({ id: client.id, officeId: testUser.officeId, name: client.name, taxpayerKind: client.type, status: 'active' }))) } }))
  let profileFails = false
  let profileRequests = 0
  let officeRequests = 0
  await context.route('**/api/office-registration', route => { officeRequests++; return route.abort() })
  await context.route('**/api/auth/me', route => {
    profileRequests++
    return route.fulfill(profileFails
    ? { status: 503, json: { message: '조회 실패' } }
    : { json: { data: testAuthUser } })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  async function visit(path) {
    const previousRequests = profileRequests
    await page.goto(base + path)
    await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false)
    const management = page.locator('.page.management')
    if (path === '/client-directory') {
      await expect(management.getByRole('heading', { level: 1 })).toHaveText('수임업체 관리')
      await expect(management.getByRole('navigation', { name: '수임업체 조회 범위' })).toBeVisible()
      await expect(management.locator('.profile-banner, .org-header')).toHaveCount(0)
      assert.equal(profileRequests, previousRequests + 1, '세션 복원 시에만 조직을 조회한다')
    }
    if (path === '/organization') {
      await expect(management.getByRole('heading', { level: 1 })).toHaveText('조직 설정')
      await expect(management.getByRole('navigation', { name: '조직 설정 메뉴' })).toBeVisible()
      await expect(management.locator('.profile-banner')).toHaveCount(0)
      assert.equal(profileRequests, previousRequests + 1, '세션 복원 시에만 조직을 조회한다')
    }
    if (path === '/mypage') {
      await expect(management.getByRole('heading', { level: 1 })).toHaveText('마이페이지')
      await expect(management.getByRole('navigation', { name: '마이페이지 메뉴' })).toBeVisible()
      await expect(management.locator('.org-header')).toHaveCount(0)
      assert.equal(profileRequests, previousRequests + 1, '마이페이지에서 조직을 중복 조회하지 않는다')
    }
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
  await page.goto(base + '/mypage')
  const editProfile = page.getByRole('button', { name: '✎ 정보 수정', exact: true })
  await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toBeVisible()
  await expect(page.locator('.page.management')).toHaveCount(0)
  profileFails = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(editProfile).toBeEnabled()
  const requestsAfterRestore = profileRequests
  await page.getByRole('button', { name: '소속 조직', exact: true }).click()
  await expect(page.locator('.tab-body')).toContainText('테스트 사무소')
  await page.getByRole('button', { name: '내 정보', exact: true }).click()
  assert.equal(profileRequests, requestsAfterRestore, '탭 전환은 store의 조직 정보를 사용한다')
  await editProfile.click()
  await page.getByLabel('이름', { exact: true }).fill('')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.locator('.management-feedback')).toContainText('이름과 올바른 이메일')
  await page.getByLabel('이름', { exact: true }).fill('수정한 이름')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.getByLabel('이름', { exact: true })).toHaveValue('수정한 이름')
  await expect(page.getByLabel('이름', { exact: true })).toBeDisabled()
  assert.equal(officeRequests, 0, '마이페이지는 별도 조직 API를 조회하지 않는다')
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}

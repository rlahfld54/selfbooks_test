import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { mockAuthenticatedContext, testUser, testClientStatus } from './auth.browser-support.mjs'

// Test-only API interception. Production directory has no sample fallback.
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3110'
const browser = await chromium.launch({ headless: true, executablePath: process.env.SELFBOOKS_BROWSER })
const records = Array.from({ length: 7 }, (_, index) => ({
  id: '10000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
  officeId: testUser.officeId, name: 'API 업체 ' + (index + 1), taxpayerKind: '법인', status: 'active',
}))
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await mockAuthenticatedContext(context)
  let result = records
  let failure = false
  let requests = 0
  await context.route('**/api/collection/status', async (route) => {
    requests++
    await route.fulfill(failure
      ? { status: 503, json: { error: { code: 'UNAVAILABLE', message: '실제 조회 실패 테스트' } } }
      : { json: { data: testClientStatus(result) } })
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/client-directory')
  await expect(page.getByRole('button', { name: '전체 업체', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'API 업체 1', exact: true })).toBeVisible()
  await expect(page.getByText('한빛디자인', { exact: true })).toHaveCount(0)
  await expect(page.locator('.stats .stat strong').first()).toContainText('7')
  await expect(page.getByRole('button', { name: '+ 수임업체 등록 · 준비 중', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(page.getByRole('button', { name: 'API 업체 7', exact: true })).toBeVisible()
  await page.getByLabel('업체명·사업자등록번호 검색', { exact: true }).fill('API 업체 1')
  await expect(page.locator('.management-table tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'API 업체 1', exact: true }).click()
  await expect(page.locator('dialog.drawer')).toContainText('정보 없음')
  await page.getByRole('button', { name: '담당자 변경 →', exact: true }).click()
  const modal = page.locator('dialog.management-dialog.modal')
  await modal.getByLabel('주담당자', { exact: true }).selectOption(testUser.id)
  await modal.getByRole('button', { name: '확인', exact: true }).click()
  await expect(modal).toHaveCount(0)
  await page.locator('dialog.drawer').getByRole('button', { name: '닫기', exact: true }).click()
  await page.getByRole('button', { name: '내 담당 업체', exact: true }).click()
  await expect(page.locator('.management-table tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: '새로고침', exact: true }).click()
  await expect(page.getByRole('button', { name: 'API 업체 1', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'API 업체 1 업무 열기', exact: true }).click()
  await page.getByRole('dialog', { name: '회사를 전환할까요?' }).getByRole('button', { name: '회사 전환', exact: true }).click()
  await expect(page).toHaveURL(new RegExp('clientId=' + records[0].id))
  await expect(page.getByRole('heading', { name: records[0].name, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: records[0].name, exact: true })).toBeVisible()
  await page.getByRole('link', { name: '내 담당 업체 보기', exact: true }).click()
  await expect(page.locator('.empty')).toContainText('배정된 담당 업체가 없습니다')
  await page.getByRole('button', { name: '전체 업체', exact: true }).click()
  failure = true
  await page.getByRole('button', { name: '새로고침', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('실제 조회 실패 테스트')
  await expect(page.getByRole('button', { name: 'API 업체 1', exact: true })).toHaveCount(0)
  failure = false
  result = []
  await page.getByRole('button', { name: '새로고침', exact: true }).click()
  await expect(page.locator('.empty')).toContainText('등록된 수임업체가 없습니다')
  result = records
  await page.getByRole('button', { name: '새로고침', exact: true }).click()
  await expect(page.getByRole('button', { name: 'API 업체 1', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  assert.ok(requests >= 5)
  await context.close()
  const staff = await browser.newContext()
  await mockAuthenticatedContext(staff)
  await staff.route('**/api/auth/me', route => route.fulfill({ json: { data: { ...testUser, role: 'STAFF' } } }))
  await staff.route('**/api/collection/status', route => route.fulfill({ json: { data: testClientStatus(records) } }))
  const staffPage = await staff.newPage()
  await staffPage.goto(base + '/client-directory?source=live')
  await expect(staffPage.getByRole('button', { name: '전체 업체', exact: true })).toHaveCount(0)
  await expect(staffPage.locator('.empty')).toContainText('배정된 담당 업체가 없습니다')
  await staffPage.goto(base + '/client-work?clientId=' + records[0].id)
  await expect(staffPage.getByRole('alert')).toContainText('접근 권한이 없습니다')
  await staff.close()
  assert.deepEqual(errors, [])
  console.warn('PASS real API source, assignments, refresh, empty/error/retry, UUID entry and STAFF gates')
}
finally {
  await browser.close()
}

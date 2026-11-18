import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { mockAuthenticatedContext, testUser } from './auth.browser-support.mjs'

// All identities and profile responses are intercepted; no real login or DB writes.
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3108'
const browser = await chromium.launch({ headless: true, executablePath: process.env.SELFBOOKS_BROWSER })
const errors = []
async function setup(user = testUser, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport })
  await mockAuthenticatedContext(context)
  await context.route('**/api/auth/me', route => route.fulfill({ json: { data: user } }))
  await context.route('**/api/office-registration', route => route.fulfill({ json: { data: { id: user.officeId, name: '테스트 사무소' } } }))
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (/hydration/i.test(message.text()) && ['error', 'warning'].includes(message.type())) {
      errors.push(message.text())
    }
  })
  return { context, page }
}
async function visit(page, path) {
  await page.goto(base + path)
  await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false)
}
async function assign(page, name, primary, assistants = []) {
  await page.getByRole('button', { name, exact: true }).click()
  await page.getByRole('button', { name: '담당자 변경 →', exact: true }).click()
  const modal = page.locator('dialog.management-dialog.modal')
  await modal.getByLabel('주담당자', { exact: true }).selectOption(primary)
  for (const id of assistants) {
    await modal.locator(`input[type="checkbox"][value="${id}"]`).check()
  }
  await modal.getByRole('button', { name: '확인', exact: true }).click()
  await expect(modal).toHaveCount(0)
  await page.locator('dialog.drawer').getByRole('button', { name: '닫기', exact: true }).click()
}
try {
  const { context, page } = await setup()
  await visit(page, '/client-directory')
  await expect(page.getByRole('button', { name: '전체 업체', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.management-table tbody tr')).toHaveCount(5)
  await page.screenshot({ path: process.env.TEMP + '/aat-directory-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(page.getByRole('button', { name: '주식회사 루미너스', exact: true })).toBeVisible()
  await page.getByLabel('업체명·사업자등록번호 검색', { exact: true }).fill('0001110001')
  await expect(page.locator('.management-table tbody tr')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '한빛디자인', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '↻ 초기화' }).click()
  await assign(page, '한빛디자인', testUser.id)
  await assign(page, '주식회사 네오테크', 'U004', [testUser.id])
  await page.getByRole('button', { name: '내 담당 업체', exact: true }).click()
  await expect(page.locator('.stats .stat strong')).toHaveText(['2개 업체', '1개 업체', '1개 업체', '1개 업체'])
  await page.getByLabel('담당 구분', { exact: true }).selectOption('주담당')
  await expect(page.locator('.management-table tbody tr')).toHaveCount(1)
  await page.getByLabel('담당 구분', { exact: true }).selectOption('보조담당')
  await expect(page.getByRole('button', { name: '주식회사 네오테크', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '↻ 초기화' }).click()
  await assign(page, '한빛디자인', 'U003')
  await expect(page.locator('.stats .stat strong')).toHaveText(['1개 업체', '0개 업체', '1개 업체', '0개 업체'])
  await page.getByRole('button', { name: '주식회사 네오테크 업무 열기', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: '회사를 전환할까요?' })
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: '회사 전환', exact: true }).click()
  await expect(page).toHaveURL(/client-work\?clientId=C002/)
  await expect(page.getByRole('heading', { name: '주식회사 네오테크', exact: true })).toBeVisible()
  await page.locator('.work-card').filter({ hasText: '일반전표입력' }).click()
  await expect(page).toHaveURL(/journal\?clientId=C002/)
  await page.getByRole('tab', { name: '업체별 업무 홈', exact: true }).click()
  await page.locator('.work-card').filter({ hasText: '환경등록' }).click()
  await page.getByRole('textbox', { name: '업태·종목 표시', exact: true }).fill('미저장 테스트')
  await page.getByRole('tab', { name: '업체별 업무 홈', exact: true }).click()
  const leave = page.getByRole('dialog', { name: '다른 페이지로 이동할까요?' })
  await expect(leave).toBeVisible()
  await leave.getByRole('button', { name: '취소', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '업태·종목 표시', exact: true })).toHaveValue('미저장 테스트')
  await page.getByRole('tab', { name: '업체별 업무 홈', exact: true }).click()
  await leave.getByRole('button', { name: '페이지 이동', exact: true }).click()
  await page.getByLabel('업무 업체 선택', { exact: true }).selectOption('C001')
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: '취소', exact: true }).click()
  await expect(page.getByLabel('업무 업체 선택', { exact: true })).toHaveValue('C002')
  await page.getByLabel('업무 업체 선택', { exact: true }).selectOption('C001')
  await confirm.getByRole('button', { name: '회사 전환', exact: true }).click()
  await expect(page).toHaveURL(/client-work\?clientId=C001/)
  await expect(page.getByRole('tab', { name: '일반전표입력', exact: true })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: /환경등록/ })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: '한빛디자인', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '내 담당 업체 보기', exact: true }).click()
  await expect(page.locator('.empty')).toContainText('배정된 담당 업체가 없습니다')
  await page.locator('.sidebar').getByRole('button', { name: /대시보드/ }).click()
  await expect(page.getByRole('region', { name: '내 담당 업체 요약' })).toContainText('전체 0개')
  await page.getByRole('link', { name: '내 담당 업체 보기 →', exact: true }).click()
  await expect(page.getByRole('button', { name: '내 담당 업체', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await context.close()

  for (const role of ['OWNER', 'STAFF']) {
    const { context, page } = await setup({ ...testUser, id: 'U001', role }, { width: 390, height: 844 })
    await visit(page, '/client-directory')
    if (role === 'OWNER') {
      await expect(page.getByRole('button', { name: '전체 업체', exact: true })).toHaveAttribute('aria-pressed', 'true')
    }
    else {
      await expect(page.getByRole('button', { name: '전체 업체', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: '+ 수임업체 등록', exact: true })).toHaveCount(0)
      await expect(page.locator('.management-table tbody tr')).toHaveCount(2)
      await page.getByRole('button', { name: '주식회사 더블유컴퍼니', exact: true }).click()
      await expect(page.getByRole('button', { name: '담당자 변경 →', exact: true })).toHaveCount(0)
      await visit(page, '/client-work?clientId=C001')
      await expect(page.getByRole('alert')).toContainText('접근 권한이 없습니다')
      await visit(page, '/client-work?clientId=C004')
      await expect(page.getByRole('heading', { name: '주식회사 더블유컴퍼니', exact: true })).toBeVisible()
      await visit(page, '/journal')
      await expect(page.getByRole('alert')).toContainText('접근 권한이 없습니다')
      await visit(page, '/client-directory?tab=all')
      await expect(page.getByRole('button', { name: '내 담당 업체', exact: true })).toHaveAttribute('aria-pressed', 'true')
    }
    await page.screenshot({ path: process.env.TEMP + '/aat-directory-' + role.toLowerCase() + '-mobile.png', fullPage: true })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.warn('PASS directory assignments, summaries, navigation, refresh, role gates and mobile overflow')
}
finally {
  await browser.close()
}

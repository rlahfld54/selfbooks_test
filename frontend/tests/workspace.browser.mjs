// Run against a built or development server. Playwright is a test runner prerequisite.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createOnboardingData } from '../app/features/onboarding/mocks.ts'
import { mockAuthenticatedContext } from './auth.browser-support.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.SELFBOOKS_PLAYWRIGHT ?? 'playwright')
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
const browser = await chromium.launch({
  executablePath: process.env.SELFBOOKS_BROWSER,
  headless: true,
})
const errors = []
const track = (page) => {
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (/hydration/i.test(message.text()) && ['error', 'warning'].includes(message.type()))
      errors.push(message.text())
  })
}
async function visit(page, path, title) {
  const response = await page.goto(base + path)
  assert.equal(response.status(), 200)
  await page.waitForFunction(
    () => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false,
  )
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
}
async function active(page, path, id) {
  await page.waitForURL((url) => url.pathname === path)
  await page.locator('#tab-' + id + '[aria-selected="true"]').waitFor()
  await page.locator('#page-' + id).waitFor()
}
const exact = true
const timeout = 7000

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await mockAuthenticatedContext(context)
  // Workspace regression runs as an onboarded user; first-visit flows have a separate suite.
  await context.addInitScript(
    (data) => {
      const key = 'accounting-pro:onboarding-demo:v1'
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data))
    },
    { ...createOnboardingData(), completed: true },
  )
  const page = await context.newPage()
  page.setDefaultTimeout(timeout)
  track(page)
  await visit(page, '/journal', '일반전표입력')
  await active(page, '/journal', 'voucher')
  await visit(page, '/clients', '거래처관리')
  await active(page, '/clients', 'partners')
  await visit(page, '/dashboard', '홈 대시보드')
  await active(page, '/dashboard', 'home')
  assert.equal((await page.locator('.sidebar').boundingBox()).width, 220)
  assert.equal((await page.locator('.app-header').boundingBox()).height, 56)
  console.log('PASS direct routes')

  const basics = page.getByRole('button', { name: '기초정보관리', exact })
  assert.equal(await basics.getAttribute('aria-expanded'), 'false')
  assert.equal(await page.getByRole('button', { name: '회사등록', exact }).count(), 0)
  await basics.click()
  await page.getByRole('button', { name: '환경등록', exact }).click()
  await active(page, '/settings', 'settings')
  await page.getByRole('heading', { name: '부가세설정', exact }).waitFor()
  await page.getByRole('textbox', { name: '의제매입세액공제', exact }).waitFor()
  await page.getByRole('heading', { name: '자동화규칙', exact }).waitFor()
  await page.getByRole('textbox', { name: '분류 규칙', exact }).waitFor()

  await page.getByRole('button', { name: '일반전표입력', exact }).first().click()
  await active(page, '/journal', 'voucher')
  await page.getByRole('heading', { name: '일반전표입력', exact }).waitFor()
  await page.getByRole('button', { name: '거래처등록', exact }).click()
  await active(page, '/clients', 'partners')
  await page.goBack()
  await active(page, '/journal', 'voucher')
  await page.goForward()
  await active(page, '/clients', 'partners')
  console.log('PASS menu and browser history')

  const search = page.getByRole('textbox', { name: '거래처 검색', exact })
  await search.fill('미래산업')
  const content = page.locator('#main-content')
  const originalWidth = (await content.boundingBox()).width
  await page.getByRole('radio', { name: /미래산업/ }).click()
  const panel = page.getByRole('complementary', { name: '거래처 상세' })
  await panel.getByRole('heading', { name: '(주)미래산업' }).waitFor()
  assert.ok((await content.boundingBox()).width < originalWidth)
  await panel.getByRole('button', { name: '상세 패널 닫기' }).click()
  await panel.waitFor({ state: 'detached' })

  await page.locator('#tab-voucher').click()
  await active(page, '/journal', 'voucher')
  const memoCell = page.locator('[data-cell="0:7"]')
  const memo = {
    fill: async (value) => {
      await memoCell.click()
      await page.getByRole('textbox', { name: '적요', exact: true }).fill(value)
      await page.keyboard.press('Enter')
    },
    inputValue: async () => memoCell.innerText(),
    waitFor: async () => memoCell.waitFor(),
  }
  await memo.fill('session only draft')
  await page.locator('[data-cell="0:5"]').click()
  await page.getByRole('combobox', { name: '거래처코드', exact: true }).fill('C002')
  await page.keyboard.press('Enter')
  assert.match(await page.locator('[data-cell="0:6"]').innerText(), /푸른유통/)
  await page.locator('#tab-partners').click()
  await active(page, '/clients', 'partners')
  assert.equal(await search.inputValue(), '미래산업')
  await page.locator('#tab-voucher').click()
  await active(page, '/journal', 'voucher')
  assert.equal(await memo.inputValue(), 'session only draft')
  console.log('PASS per-tab input, panel and search')

  await page.getByRole('button', { name: '거래처등록', exact }).click()
  const leave = page.getByRole('dialog', { name: '다른 페이지로 이동할까요?' })
  await leave.getByRole('button', { name: '취소', exact }).click()
  await active(page, '/journal', 'voucher')
  assert.equal(await memo.inputValue(), 'session only draft')
  // A cancelled browser Back restores the original URL and keeps the draft.
  await page.goBack()
  await leave.getByRole('button', { name: '취소', exact }).click()
  await active(page, '/journal', 'voucher')
  await page.getByRole('button', { name: '거래처등록', exact }).click()
  await leave.getByRole('button', { name: '페이지 이동', exact }).click()
  await active(page, '/clients', 'partners')
  const closeJournal = page.getByRole('button', { name: '일반전표입력 탭 닫기' })
  await closeJournal.click()
  const close = page.getByRole('dialog', { name: '이 탭을 닫을까요?' })
  await close.getByRole('button', { name: '취소', exact }).click()
  await page.locator('#tab-voucher').click()
  assert.equal(await memo.inputValue(), 'session only draft')

  const native = page.waitForEvent('dialog')
  const attemptedClose = page.close({ runBeforeUnload: true })
  const prompt = await native
  assert.equal(prompt.type(), 'beforeunload')
  await prompt.dismiss()
  await attemptedClose
  assert.equal(page.isClosed(), false)

  await closeJournal.click()
  await close.getByRole('button', { name: '변경 사항 버리기' }).click()
  await active(page, '/dashboard', 'home')
  await page.locator('#tab-voucher').waitFor({ state: 'detached' })
  await page.getByRole('button', { name: '일반전표입력', exact }).first().click()
  await active(page, '/journal', 'voucher')
  assert.equal(await memo.inputValue(), '사무용품 구입')
  console.log('PASS cancellation, native beforeunload and discard')

  await memo.fill('discard on company switch')
  const company = page.getByRole('combobox', { name: '샘플 회사 선택' })
  await company.selectOption('demo-woori')
  const companyDialog = page.getByRole('dialog', { name: '회사를 전환할까요?' })
  await companyDialog.getByRole('button', { name: '취소', exact }).click()
  assert.equal(await company.inputValue(), 'demo-happy')
  assert.equal(await memo.inputValue(), 'discard on company switch')
  await company.selectOption('demo-woori')
  await companyDialog.getByRole('button', { name: '회사 전환', exact }).click()
  await active(page, '/dashboard', 'home')
  assert.equal(await company.inputValue(), 'demo-woori')
  assert.equal(await page.locator('[role=tab][id^=tab-]').count(), 1)
  await company.selectOption('demo-happy')
  await active(page, '/journal', 'voucher')
  await memo.waitFor()
  assert.equal(await memo.inputValue(), '사무용품 구입')
  await page.getByRole('combobox', { name: '테이블 밀도' }).selectOption('compact')
  await page.reload()
  await active(page, '/journal', 'voucher')
  await page.locator('#tab-partners').waitFor()
  assert.equal(await memo.inputValue(), '사무용품 구입')
  assert.equal(await page.getByRole('combobox', { name: '테이블 밀도' }).inputValue(), 'compact')
  const persisted = await page.evaluate(() => JSON.stringify(localStorage))
  assert.doesNotMatch(persisted, /session only draft|discard on company switch|미래산업/)
  await visit(page, '/dashboard', '홈 대시보드')
  await page.getByRole('button', { name: '이어서 열기' }).click()
  await active(page, '/journal', 'voucher')
  console.log('PASS company isolation, reload and resume')

  let listCalls = 0
  let unavailable = true
  const record = {
    id: 'fixture-1',
    officeId: 'office',
    name: '회귀 테스트 수임업체',
    taxpayerKind: '법인',
    status: '활성',
  }
  const headers = { 'access-control-allow-origin': new URL(base).origin }
  await page.route('**/api/clients', (route) => {
    listCalls++
    return route.fulfill({
      status: unavailable ? 503 : 200,
      headers,
      json: unavailable
        ? { error: { code: 'DIRECTORY_UNAVAILABLE', message: 'Unavailable' } }
        : { data: [record] },
    })
  })
  await page.route('**/api/clients/fixture-1', (route) =>
    route.fulfill({ headers, json: { data: record } }),
  )
  await visit(page, '/client-directory', '수임업체관리')
  await page.getByText('수임업체 목록을 불러오지 못했습니다.').waitFor()
  unavailable = false
  await page.getByRole('button', { name: '다시 시도' }).click()
  await page.getByRole('radio', { name: /회귀 테스트 수임업체/ }).click()
  await page.getByRole('heading', { name: '수임업체 상세' }).waitFor()
  await page.locator('dd').filter({ hasText: record.name }).waitFor()
  await page.locator('#tab-home').click()
  await active(page, '/dashboard', 'home')
  await page.locator('#tab-clients').click()
  await active(page, '/client-directory', 'clients')
  await page.locator('dd').filter({ hasText: record.name }).waitFor()
  assert.ok(listCalls >= 3)
  console.log('PASS Fastify contract fixture, retry, detail and refetch')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.setDefaultTimeout(timeout)
  track(mobile)
  await visit(mobile, '/clients', '거래처관리')
  await mobile.getByRole('button', { name: '메뉴 열기' }).click()
  await mobile.getByRole('button', { name: '일반전표입력', exact }).click()
  await active(mobile, '/journal', 'voucher')
  await mobile.getByRole('button', { name: '인사이트 열기', exact }).click()
  const overlay = mobile.getByRole('dialog', { name: '전표 인사이트' })
  await overlay.waitFor()
  assert.equal(Math.round((await overlay.boundingBox()).width), 390)
  assert.equal(await mobile.locator('#main-content').getAttribute('inert'), '')
  await mobile.keyboard.press('Escape')
  await overlay.waitFor({ state: 'detached' })
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  console.log('PASS 390px mobile layout, overlay, keyboard and hydration')

  for (const [path, title] of [
    ['/ledger', '전표조회 및 검증'],
    ['/sales', '매입매출전표 입력 · Mock'],
    ['/payroll', '인사급여'],
    ['/tax', '부가가치세'],
    ['/reports', '장부 및 재무제표'],
    ['/settings', '환경등록'],
  ])
    await visit(page, path, title)
  await visit(page, '/components', '공통 UI 컴포넌트')
  await page.locator('#gallery-text').fill('갤러리 입력')
  await page.locator('#tab-home').click()
  await active(page, '/dashboard', 'home')
  await page.locator('#tab-components').click()
  await active(page, '/components', 'components')
  assert.equal(await page.locator('#gallery-text').inputValue(), '갤러리 입력')
  assert.deepEqual(errors, [])
  console.log('PASS existing preview routes and gallery input')
} finally {
  await browser.close()
}

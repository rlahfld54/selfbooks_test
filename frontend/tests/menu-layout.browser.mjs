import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
const browser = await chromium.launch({ headless: true, executablePath: process.env.SELFBOOKS_BROWSER })
const base = process.env.SELFBOOKS_TEST_URL || 'http://localhost:3101'
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', error => errors.push(error.message))
  async function visit(path) {
    assert.equal((await page.goto(base + path)).status(), 200)
    await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false)
  }
  await visit('/company')
  await page.getByRole('heading', { name: '회사등록', exact: true }).waitFor()
  assert.equal(await page.locator('.app-shell').count(), 0)
  assert.equal(await page.locator('iframe').count(), 0)
  await page.getByRole('button', { name: '수임업체 관리 →', exact: true }).click()
  await page.waitForURL('**/client-directory')
  await page.getByRole('heading', { name: '수임업체 관리', exact: true }).waitFor()
  page.on('dialog', dialog => dialog.accept())
  await visit('/accounts')
  await page.getByLabel('계정과목 검색', { exact: true }).fill('존재하지않는코드')
  await page.getByText('검색 결과가 없습니다. 검색어를 변경하세요.').waitFor()
  await page.getByRole('button', { name: '거래적요관리', exact: true }).click()
  await page.getByText('등록된 거래적요가 없습니다', { exact: true }).waitFor()
  await page.getByRole('button', { name: '연결관계', exact: true }).click()
  await page.getByText('설정된 연결관계가 없습니다', { exact: true }).waitFor()
  for (const path of ['/opening-balances', '/collection', '/closing', '/dashboard']) await visit(path)
  await page.setViewportSize({ width: 390, height: 844 })
  await visit('/company')
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  assert.deepEqual(errors, [])
  console.log('PASS native reference shell, company entry, account search, direct routes and mobile layout')
} finally { await browser.close() }


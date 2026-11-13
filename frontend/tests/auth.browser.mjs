import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { testSession, testUser } from './auth.browser-support.mjs'
import { createOnboardingData } from '../app/features/onboarding/mocks.ts'
const browser = await chromium.launch({ headless: true, ...(process.env.SELFBOOKS_BROWSER ? { executablePath: process.env.SELFBOOKS_BROWSER } : {}) })
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
try {
  const context = await browser.newContext()
  await context.addInitScript(data => {
    localStorage.setItem('accounting-pro:onboarding-demo:v1', JSON.stringify(data))
  }, { ...createOnboardingData(), completed: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (/hydration/i.test(m.text()) && ['error', 'warning'].includes(m.type())) errors.push(m.text()) })
  let validPassword = false, authorized = true
  await context.route('**/auth/v1/token**', async route => {
    assert.equal(route.request().postDataJSON().email, 'test@example.test')
    await route.fulfill(validPassword ? { json: testSession() } : { status: 400, json: { code: 'invalid_credentials', msg: 'Invalid login credentials' } })
  })
  await context.route('**/auth/v1/logout**', route => route.fulfill({ status: 204 }))
  await context.route('**/api/auth/me', route => route.fulfill(authorized ? { json: { data: testUser } } : { status: 403, json: { error: { message: '활성 관리자 계정과 사무소 소속 등록을 확인해 주세요.' } } }))
  await page.goto(base + '/dashboard')
  await page.waitForURL('**/login')
  assert.equal(await page.getByText('테스트 계정 입력').count(), 0)
  await page.getByLabel('이메일', { exact: true }).fill('test@example.test')
  await page.getByLabel('비밀번호', { exact: true }).fill('not-a-real-password')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: '이메일 또는 비밀번호' }).waitFor()
  validPassword = true; authorized = false
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: '소속 등록' }).waitFor()
  authorized = true
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.waitForURL('**/dashboard')
  assert.ok(await page.evaluate(() => sessionStorage.getItem('selfbooks:auth')))
  assert.equal(await page.evaluate(() => localStorage.getItem('selfbooks:auth')), null)
  await page.reload()
  await page.getByRole('button', { name: '로그아웃', exact: true }).waitFor()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await page.waitForURL('**/login')
  await page.waitForFunction(() => !sessionStorage.getItem('selfbooks:auth'))
  await page.getByLabel('이메일', { exact: true }).fill('test@example.test')
  await page.getByLabel('비밀번호', { exact: true }).fill('not-a-real-password')
  await page.getByLabel('로그인 상태 유지').check()
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.waitForURL('**/dashboard')
  assert.ok(await page.evaluate(() => localStorage.getItem('selfbooks:auth')))
  assert.equal(await page.evaluate(() => sessionStorage.getItem('selfbooks:auth')), null)
  assert.deepEqual(errors, [])
  console.log('PASS login failure, membership denial, login, reload, logout, remember, hydration')
} finally { await browser.close() }

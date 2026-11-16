import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { testSession, testUser } from './auth.browser-support.mjs'
import { createOnboardingData } from '../app/features/onboarding/mocks.ts'
const browser = await chromium.launch({ headless: true, ...(process.env.SELFBOOKS_BROWSER ? { executablePath: process.env.SELFBOOKS_BROWSER } : {}) })
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
try {
  const context = await browser.newContext()
  await context.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@*/**', route => route.abort())
  await context.addInitScript(data => {
    localStorage.setItem('accounting-pro:onboarding-demo:v1', JSON.stringify(data))
  }, { ...createOnboardingData(), completed: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(`${new URL(page.url()).pathname}: ${e.message}`))
  page.on('console', m => {
    if (/hydration/i.test(m.text()) && ['error', 'warning'].includes(m.type())) {
      errors.push(`${new URL(page.url()).pathname}: ${m.text()}`)
    }
  })
  let validPassword = false, authorized = true
  let authUnavailable = false
  let authChecks = 0
  let officeStatus = 403
  const oauthProviders = []
  let codeExchanges = 0
  let linkedProvider = ''

  function oauthCallback(request) {
    const url = new URL(request.url())
    const callback = new URL(url.searchParams.get('redirect_to'))
    assert.equal(callback.href, base + '/auth/callback')
    assert.equal(url.searchParams.get('code_challenge_method'), 's256')
    assert.ok(url.searchParams.get('code_challenge'))
    return { callback, provider: url.searchParams.get('provider') }
  }

  await context.route('**/auth/v1/authorize?*', async route => {
    const { callback, provider } = oauthCallback(route.request())
    oauthProviders.push(provider)
    if (provider === 'kakao') callback.hash = 'error=access_denied'
    else callback.searchParams.set('code', 'mock-oauth-code')
    await route.fulfill({ status: 302, headers: { location: callback.href } })
  })
  await context.route('**/auth/v1/user/identities/authorize?*', async route => {
    const { callback, provider } = oauthCallback(route.request())
    assert.match(route.request().headers().authorization, /^Bearer /)
    linkedProvider = provider
    callback.searchParams.set('code', 'mock-link-code')
    await route.fulfill({ json: { url: callback.href } })
  })
  await context.route('**/auth/v1/token**', async route => {
    if (new URL(route.request().url()).searchParams.get('grant_type') === 'pkce') {
      const { auth_code, code_verifier } = route.request().postDataJSON()
      assert.ok(['mock-oauth-code', 'mock-link-code'].includes(auth_code))
      assert.ok(code_verifier)
      codeExchanges++
      await route.fulfill({ json: testSession() })
      return
    }
    assert.equal(route.request().postDataJSON().email, 'test@example.test')
    await route.fulfill(validPassword ? { json: testSession() } : { status: 400, json: { code: 'invalid_credentials', msg: 'Invalid login credentials' } })
  })
  await context.route('**/auth/v1/logout**', route => route.fulfill({ status: 204 }))
  await context.route('**/api/auth/me', route => {
    authChecks++
    if (authUnavailable) return route.fulfill({ status: 503, json: {} })
    return route.fulfill(authorized ? { json: { data: testUser } } : { status: 403, json: { error: { message: '활성 관리자 계정과 사무소 소속 등록을 확인해 주세요.' } } })
  })
  await context.route('**/api/office-registration', route => route.fulfill({ status: officeStatus, json: {} }))
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
  const checksBeforeLogin = authChecks
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.getByRole('heading', { name: '홈 대시보드', exact: true }).waitFor()
  assert.equal(authChecks, checksBeforeLogin + 1)
  assert.ok(await page.evaluate(() => sessionStorage.getItem('selfbooks:auth')))
  assert.equal(await page.evaluate(() => localStorage.getItem('selfbooks:auth')), null)
  authUnavailable = true
  await page.reload()
  await page.getByRole('alert').filter({ hasText: '로그인 상태를 확인하지 못했습니다' }).waitFor()
  await page.waitForURL('**/dashboard')
  assert.ok(await page.evaluate(() => sessionStorage.getItem('selfbooks:auth')))
  authUnavailable = false
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await page.getByRole('button', { name: '로그아웃', exact: true }).waitFor()
  const checksAfterRestore = authChecks
  await page.getByRole('button', { name: '기초정보관리', exact: true }).click()
  await page.getByRole('button', { name: '회사등록', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: '이 업무에 접근할 권한이 없습니다.' }).waitFor()
  officeStatus = 503
  await page.getByRole('button', { name: '다시 조회', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: '잠시 후 다시 시도해 주세요.' }).waitFor()
  await page.locator('#tab-home').click()
  await page.getByRole('heading', { name: '홈 대시보드', exact: true }).waitFor()
  assert.equal(authChecks, checksAfterRestore)
  assert.ok(await page.evaluate(() => sessionStorage.getItem('selfbooks:auth')))
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

  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await page.waitForURL('**/login')
  await page.waitForFunction(() => !localStorage.getItem('selfbooks:auth'))

  await page.setViewportSize({ width: 390, height: 844 })
  for (const name of ['카카오 로그인', '네이버 로그인', 'Google 로그인']) {
    const button = page.getByRole('button', { name, exact: true })
    await button.waitFor()
    const box = await button.boundingBox()
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390)
  }
  await page.getByRole('button', { name: '카카오 로그인' }).click()
  await page.getByRole('alert').filter({ hasText: 'SNS 인증이 취소' }).waitFor()
  await page.waitForURL('**/auth/callback')
  assert.equal(codeExchanges, 0)
  await page.getByRole('link', { name: '로그인 화면으로' }).click()

  authorized = false
  await page.getByRole('button', { name: '네이버 로그인' }).click()
  await page.getByRole('alert').filter({ hasText: '소속 등록' }).waitFor()
  assert.ok(await page.evaluate(() => sessionStorage.getItem('selfbooks:auth')))
  await page.getByRole('link', { name: '로그인 화면으로' }).click()

  authorized = true
  await page.getByLabel('로그인 상태 유지').check()
  await page.getByRole('button', { name: 'Google 로그인' }).click()
  await page.waitForURL('**/dashboard')
  assert.ok(await page.evaluate(() => localStorage.getItem('selfbooks:auth')))
  assert.deepEqual(oauthProviders, ['kakao', 'custom:naver', 'google'])
  assert.equal(codeExchanges, 2)

  await page.getByRole('button', { name: 'SNS 계정 연결', exact: true }).click()
  await page.getByRole('button', { name: '네이버 연결', exact: true }).click()
  await page.waitForURL('**/auth/callback?code=mock-link-code')
  await page.waitForURL('**/dashboard')
  assert.equal(linkedProvider, 'custom:naver')
  assert.equal(codeExchanges, 3)

  await page.setViewportSize({ width: 1440, height: 900 })
  officeStatus = 401
  const companyButton = page.getByRole('button', { name: '회사등록', exact: true })
  if (await companyButton.count() === 0) {
    await page.getByRole('button', { name: '기초정보관리', exact: true }).click()
  }
  await companyButton.click()
  await page.waitForURL('**/login')
  await page.getByRole('status').filter({ hasText: '로그인이 만료되었습니다' }).waitFor()
  assert.equal(await page.evaluate(() => localStorage.getItem('selfbooks:auth')), null)

  assert.deepEqual(errors, [])
  console.log('PASS password login, mobile SNS buttons, OAuth cancellation, membership denial, PKCE login, account linking, remember, hydration')
} finally { await browser.close() }

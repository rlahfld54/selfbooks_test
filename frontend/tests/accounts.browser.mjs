import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { mockAuthenticatedContext } from './auth.browser-support.mjs'
const data = JSON.parse(
  readFileSync(
    new URL('../app/features/accounts/referenceData.json', import.meta.url),
    'utf8',
  ).replace(/^\uFEFF/, ''),
)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
await mockAuthenticatedContext(context)
const accounts = data.ACCOUNTS.map((a) => ({
  sourceId: String(a.code),
  code: String(a.code),
  name: a.name,
  englishName: '',
  categoryCode: { 자산: '1', 부채: '2', 자본: '3', 수익: '4', 비용: '5' }[a.nature] ?? 'SPECIAL',
  subcategory:
    data.MIDCATS.find((m) => {
      const [lo, hi] = m.range.split('~').map(Number)
      return a.code >= lo && a.code <= hi
    })?.mid ?? '',
  attribute: a.attr,
  normalBalance: ['자산', '비용'].includes(a.nature) ? 'D' : 'C',
  relatedAccount: a.relcode ? String(a.relcode) : null,
  statementCode: null,
  fxMethodCode: '0',
  businessCar: false,
  isActive: true,
  isLocked: a.code < 1000,
}))
await context.route('**/api/account-defaults', (route) =>
  route.fulfill({ json: { data: accounts } }),
)
await context.route('**/api/account-summaries', (route) =>
  route.fulfill({
    json: {
      data: {
        client: { id: 'test-client', name: '테스트회사' },
        summaries: data.DESCS.map((d) => ({
          sourceId: String(d.code),
          code: String(d.code),
          summaryNo: d.code,
          name: d.name,
          typeCode: d.kind === '고정적요' ? 'FIXED' : 'VARIABLE',
          transactionElementCode: d.ttype ? parseInt(d.ttype) : null,
          isActive: true,
          accountSourceId: String(d.acode),
          accountDefaultId: String(d.acode),
          accountCode: String(d.acode),
          accountName: d.aname,
        })),
      },
    },
  }),
)
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
try {
  assert.equal(
    (await page.goto(process.env.SELFBOOKS_TEST_URL || 'http://localhost:3000/accounts')).status(),
    200,
  )
  await page.getByRole('heading', { name: '계정별 적요 페이지', exact: true }).waitFor()
  const list = page.locator('.am-list'),
    detail = page.locator('#account-detail')
  await list.locator('tbody tr').first().waitFor()
  assert.equal(await list.locator('tbody tr').count(), data.DESCS.length)
  assert.equal(await list.locator('th').count(), 3)
  assert.equal(await page.locator('.am-tabs').count(), 0)
  assert.equal(await detail.locator('.am-detail-nav').count(), 0)
  const before = await list.boundingBox()
  const toggle = page.getByRole('button', { name: '카테고리 고정', exact: true })
  await toggle.hover()
  assert.equal(Math.round((await page.locator('.am-category-overlay').boundingBox()).width), 232)
  assert.deepEqual(await list.boundingBox(), before)
  await toggle.click()
  await page.locator('h1').hover()
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
  await toggle.click()
  await page.locator('h1').hover()
  assert.equal(Math.round((await page.locator('.am-category-overlay').boundingBox()).width), 40)
  await list.locator('summary').click()
  await list.getByLabel('중분류', { exact: true }).check()
  assert.equal(await list.locator('th').count(), 4)
  await list.locator('summary').click()
  await detail.getByRole('button', { name: '좌우형', exact: true }).click()
  await page.reload()
  await list.locator('tbody tr').first().waitFor()
  assert.equal(await list.locator('th').count(), 4)
  assert.equal(
    await detail.getByRole('button', { name: '좌우형', exact: true }).getAttribute('aria-pressed'),
    'true',
  )
  await list.locator('summary').click()
  await list.getByRole('button', { name: '기본값 복원' }).click()
  assert.equal(await list.locator('th').count(), 3)
  await list.locator('summary').click()
  await detail.getByText('표준재무제표코드', { exact: true }).waitFor()
  await detail.getByRole('button', { name: '편집', exact: true }).click()
  await detail.getByLabel('출력용 명칭', { exact: true }).fill('변경 테스트')
  await list.locator('tbody tr').nth(1).click()
  await page.getByText('입력 중인 변경사항을 버리고 계속할까요?', { exact: true }).waitFor()
  await page.getByRole('button', { name: '버리고 계속', exact: true }).click()
  assert.equal(await detail.locator('form').count(), 0)
  await detail.evaluate((e) => (e.scrollTop = 100))
  await list.locator('tbody tr').nth(2).click()
  assert.equal(await detail.evaluate((e) => e.scrollTop), 0)
  await detail.getByRole('button', { name: '편집', exact: true }).click()
  assert.equal(await detail.getByLabel('계정코드', { exact: false }).isDisabled(), true)
  assert.equal(await detail.getByLabel('표준재무제표코드', { exact: true }).isDisabled(), true)
  await detail.getByLabel('출력용 명칭', { exact: true }).fill('표시명 저장 검증')
  await detail.getByRole('button', { name: '저장', exact: true }).click()
  await detail.getByText('표시명 저장 검증', { exact: true }).waitFor()
  await page.getByLabel('거래적요 검색', { exact: true }).fill('현금입금')
  assert.equal(
    await list.locator('tbody tr').count(),
    data.DESCS.filter((d) => d.name.includes('현금입금')).length,
  )
  await page.getByLabel('거래적요 검색', { exact: true }).fill('')
  await list.getByRole('button', { name: '기본 밀도', exact: true }).click()
  assert.ok(await list.locator('table').evaluate((e) => e.classList.contains('compact')))
  await list.getByRole('button', { name: '압축 밀도', exact: true }).click()
  const scrolling = await page.evaluate(() => {
    const c = document.querySelector('.content'),
      g = document.querySelector('.am-list .am-scroll'),
      d = document.querySelector('#account-detail')
    return {
      outer: c.scrollHeight - c.clientHeight,
      grid: g.scrollHeight - g.clientHeight,
      detail: getComputedStyle(d).overflowY,
    }
  })
  assert.ok(scrolling.outer <= 1, JSON.stringify(scrolling))
  assert.ok(scrolling.grid > 100, JSON.stringify(scrolling))
  assert.equal(scrolling.detail, 'auto')
  await page.screenshot({ path: 'tests/screenshots/accounts-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await list.isVisible())
  assert.ok(await detail.isVisible())
  await page.screenshot({ path: 'tests/screenshots/accounts-mobile.png' })
  assert.deepEqual(errors, [])
  console.log(
    'PASS summary rows, 3 columns, overlay hover/pin, persistent preferences, continuous detail, unsaved guard, scroll reset, independent scrolling, mobile panels',
  )
} finally {
  await browser.close()
}

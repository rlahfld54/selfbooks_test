import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mockAuthenticatedContext } from './auth.browser-support.mjs'
import { previewSalesJournal } from '../app/features/sales-journal/services/previewSalesJournal.ts'

const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
const browser = await chromium.launch({ executablePath: process.env.SELFBOOKS_BROWSER })
const { promise: release, resolve: releaseRequest } = Promise.withResolvers()
try {
  const context = await browser.newContext()
  await mockAuthenticatedContext(context)
  await context.route('**/api/sales-journal/meta', async route => {
    await route.fulfill({ json: await previewSalesJournal.metadata() })
  })
  let listCalls = 0
  await context.route('**/api/sales-journal', async route => {
    if (++listCalls === 1) {
      await release
      await route.abort().catch(() => undefined)
      return
    }
    await route.fulfill({ json: await previewSalesJournal.list() })
  })
  const page = await context.newPage()
  const isList = request => new URL(request.url()).pathname === '/api/sales-journal'
  await page.goto(base + '/dashboard')
  const firstList = page.waitForRequest(isList)
  await page.getByRole('button', { name: '매입매출전표입력', exact: true }).first().click()
  const firstRequest = await firstList
  const cancelled = page.waitForEvent('requestfailed', request => request === firstRequest)
  await page.locator('#tab-home').click()
  await page.getByRole('heading', { name: '홈 대시보드', exact: true }).waitFor()
  assert.ok((await cancelled).failure())
  releaseRequest()

  await page.getByRole('tab', { name: '매입매출전표입력', exact: true }).click()
  await page.getByRole('row', { name: /사무용품/ }).waitFor()
  assert.equal(listCalls, 2)
} finally {
  releaseRequest()
  await browser.close()
}

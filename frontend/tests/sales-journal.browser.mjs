import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
const browser = await chromium.launch({
  executablePath:
    process.env.SELFBOOKS_BROWSER ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (/hydration/i.test(m.text()) && ['error', 'warning'].includes(m.type())) errors.push(m.text())
})
let savedId = ''
let version = 0
try {
  await page.goto(base + '/sales-journal')
  await page.getByRole('heading', { name: '매입매출전표입력', exact: true }).waitFor()
  await page.getByRole('button', { name: '신규 전표', exact: true }).waitFor()
  await page
    .getByLabel('회계기간', { exact: true })
    .locator('option')
    .first()
    .waitFor({ state: 'attached' })
  await page.getByRole('button', { name: '거래처 검색', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '거래처 검색' })
  await dialog.getByRole('combobox').fill('샘플문구유통')
  await dialog.getByRole('combobox').press('Enter')
  await dialog.waitFor({ state: 'hidden' })
  await page.getByLabel('품명', { exact: true }).fill('브라우저 검증용 전표')
  await page.getByLabel('공급가액', { exact: true }).fill('100')
  await page.getByLabel('부가세', { exact: true }).fill('0')
  await page.getByRole('button', { name: '+ 분개 행 추가', exact: true }).click()
  await page.getByRole('button', { name: '+ 분개 행 추가', exact: true }).click()
  await page.getByLabel('분개 1 계정과목', { exact: true }).selectOption({ index: 1 })
  await page.getByLabel('분개 2 계정과목', { exact: true }).selectOption({ index: 2 })
  await page.getByLabel('분개 2 구분', { exact: true }).selectOption('credit')
  await page.getByLabel('분개 1 금액', { exact: true }).fill('100')
  await page.getByLabel('분개 2 금액', { exact: true }).fill('99')
  await page.getByRole('button', { name: '저장', exact: true }).first().click()
  await page
    .getByRole('alert')
    .filter({ hasText: '차변과 대변 합계가 일치하지 않습니다.' })
    .waitFor()
  await page.getByLabel('분개 2 금액', { exact: true }).fill('100')
  await page.getByRole('button', { name: '저장', exact: true }).first().click()
  await page.getByRole('alert').filter({ hasText: '과세 거래의 부가세가 0원입니다.' }).waitFor()
  await page.getByRole('checkbox', { name: /확인요망/ }).check()
  const saveResponse = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/sales-journal'),
  )
  await page.getByRole('button', { name: '저장', exact: true }).first().click()
  const response = await saveResponse
  assert.equal(response.status(), 200)
  const saved = (await response.json()).data
  savedId = saved.id
  version = saved.version
  await page.getByRole('status').filter({ hasText: 'DB에 미확정 전표로 저장했습니다.' }).waitFor()
  await page.reload()
  await page.getByRole('cell', { name: '브라우저 검증용 전표', exact: true }).click()
  assert.equal(await page.getByLabel('공급가액', { exact: true }).inputValue(), '100')
  await page.getByLabel('품명', { exact: true }).fill('브라우저 수정 검증')
  const updateResponse = page.waitForResponse((r) => r.request().method() === 'PUT')
  await page.getByRole('button', { name: '저장', exact: true }).first().click()
  const updated = await updateResponse
  assert.equal(updated.status(), 200)
  version = (await updated.json()).data.version
  await page.screenshot({ path: '../docs/ui-screenshots/sales-journal-1440.png', fullPage: true })
  await page.getByLabel('조회 시작일').fill('2026-12-31')
  await page.getByLabel('조회 종료일').fill('2026-01-01')
  await page.getByRole('button', { name: '조회', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: '조회 시작일과 종료일을 확인하세요.' }).waitFor()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page
    .getByRole('dialog', { name: '전표를 삭제할까요?' })
    .getByRole('button', { name: '취소', exact: true })
    .click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await page
    .getByRole('dialog', { name: '전표를 삭제할까요?' })
    .getByRole('button', { name: '삭제', exact: true })
    .click()
  await page.getByRole('status').filter({ hasText: '전표와 분개를 삭제했습니다.' }).waitFor()
  savedId = ''
  await page.getByRole('button', { name: '신규 전표', exact: true }).click()
  await page.getByLabel('품명', { exact: true }).fill('보호할 입력')
  await page.getByRole('button', { name: '신규 전표', exact: true }).click()
  await page
    .getByRole('dialog', { name: '변경 사항을 버릴까요?' })
    .getByRole('button', { name: '취소', exact: true })
    .click()
  assert.equal(await page.getByLabel('품명', { exact: true }).inputValue(), '보호할 입력')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '../docs/ui-screenshots/sales-journal-390.png', fullPage: true })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  assert.deepEqual(errors, [])
  console.log(
    'PASS sales UI create, reload, update, delete, server errors, cancel, mobile and hydration',
  )
} finally {
  if (savedId) {
    const result = await page.request.delete(
      'http://localhost:4000/api/sales-journal/' + savedId + '?version=' + version,
      { headers: { origin: base, 'content-type': 'application/json' }, data: {} },
    )
    assert.equal(result.status(), 200)
  }
  await browser.close()
}

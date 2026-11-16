import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import * as XLSX from 'xlsx'
import { mockAuthenticatedContext } from './auth.browser-support.mjs'
import { createOnboardingData } from '../app/features/onboarding/mocks.ts'

const browser = await chromium.launch({ headless: true, executablePath: process.env.SELFBOOKS_BROWSER })
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await mockAuthenticatedContext(context)
  const stored = [], batches = new Map()
  let failNext = true, failedBatch = ''
  await context.route('**/api/partners', route => route.fulfill({ json: { data: stored } }))
  await context.route('**/api/partners/import', async route => {
    const body = route.request().postDataJSON()
    assert.ok(body.batchId)
    assert.equal('officeId' in body, false)
    if (failNext) {
      failNext = false; failedBatch = body.batchId
      await route.fulfill({ status: 503, json: { error: { message: '테스트 저장 실패' } } }); return
    }
    if (!stored.length) assert.equal(body.batchId, failedBatch)
    if (!batches.has(body.batchId)) {
      const rows = body.rows.map((row, i) => ({
        id: `${body.batchId}:${i}`, name: row.information.name, code: row.information.code,
        registration: row.information.registration, contact: row.information.phone || '—',
        status: row.importIssues.length ? '확인요망' : '거래 중', date: '—', amount: '', ...row,
      }))
      stored.push(...rows); batches.set(body.batchId, rows)
    }
    await route.fulfill({ json: { data: batches.get(body.batchId) } })
  })
  await context.addInitScript(data => localStorage.setItem('accounting-pro:onboarding-demo:v1', JSON.stringify(data)), { ...createOnboardingData(), completed: true })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (/hydration/i.test(message.text()) && ['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.goto((process.env.SELFBOOKS_TEST_URL || 'http://localhost:3000') + '/clients')
  await page.getByRole('button', { name: '엑셀 등록', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '거래처 엑셀 등록' })
  const headers = ['사업자등록번호', '사업자 구분', '업체 명', '대표자 명', '법인등록번호', '업종코드', '업태', '업종', '우편번호', '기본주소']
  function file(rows) {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), '거래처')
    return { name: 'partners.xls', mimeType: 'application/vnd.ms-excel', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xls' }) }
  }
  const sample = ['0123456789', '1', '엑셀테스트상사', '테스트', '', '523932', '소매업', '문구', '01234', '서울시 테스트로 1']
  await dialog.getByLabel('거래처 엑셀 파일').setInputFiles(file([sample, sample]))
  await dialog.getByText('총 2건 · 오류 1건 · 확인요망 0건').waitFor()
  assert.equal(await dialog.getByRole('button', { name: '2건 DB에 저장' }).isDisabled(), false)
  await dialog.getByRole('checkbox', { name: '오류 행만 보기' }).check()
  assert.equal(await dialog.locator('tbody tr').count(), 1)
  assert.equal(await dialog.locator('tbody tr td').first().textContent(), '3')
  await dialog.getByRole('checkbox', { name: '오류 행만 보기' }).uncheck()
  assert.equal(await dialog.locator('tbody tr').count(), 2)
  await dialog.getByLabel('거래처 엑셀 파일').setInputFiles(file([sample]))
  await dialog.getByText('총 1건 · 오류 0건 · 확인요망 0건').waitFor()
  assert.equal(await dialog.getByRole('button', { name: '1건 DB에 저장' }).isDisabled(), false)
  await dialog.getByRole('checkbox', { name: '오류 행만 보기' }).check()
  await dialog.getByText('오류 행이 없습니다.', { exact: true }).waitFor()
  await dialog.getByRole('button', { name: '1건 DB에 저장' }).click()
  await dialog.getByRole('alert').filter({ hasText: '테스트 저장 실패' }).waitFor()
  assert.equal(await dialog.locator('tbody tr').count(), 0) // errors-only filter is still active
  await dialog.getByRole('button', { name: '1건 DB에 저장' }).click()
  await page.getByText('1건을 DB에 저장했습니다.', { exact: true }).waitFor()
  assert.equal(await page.locator('.data-table thead th').count(), 16) // selection + requested 15
  await page.getByRole('textbox', { name: '거래처 검색', exact: true }).fill('엑셀테스트상사')
  await page.getByRole('cell', { name: '엑셀테스트상사', exact: true }).click()
  const detail = page.getByRole('complementary', { name: '거래처 상세' })
  await detail.getByText('0123456789', { exact: true }).waitFor()
  await detail.getByText('01234', { exact: true }).waitFor()
  await page.locator('#tab-home').click()
  await page.locator('#tab-partners').click()
  await page.getByRole('cell', { name: '엑셀테스트상사', exact: true }).waitFor()
  await page.getByRole('button', { name: '엑셀 등록', exact: true }).click()
  await dialog.getByLabel('거래처 엑셀 파일').setInputFiles(file([sample]))
  await dialog.getByText('총 1건 · 오류 1건 · 확인요망 0건').waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  const bounds = await dialog.boundingBox()
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391)
  if (process.env.SELFBOOKS_SCREENSHOT) await page.screenshot({ path: process.env.SELFBOOKS_SCREENSHOT })
  await page.setViewportSize({ width: 1440, height: 900 })
  const different = [...sample]; different[0] = '1234567890'; different[2] = '정상추가상사'
  await dialog.getByLabel('거래처 엑셀 파일').setInputFiles(file([sample, different]))
  await dialog.getByText('총 2건 · 오류 1건 · 확인요망 0건').waitFor()
  await dialog.getByRole('checkbox', { name: '오류 행만 보기' }).check()
  assert.equal(await dialog.locator('tbody tr').count(), 1)
  await dialog.getByRole('button', { name: '2건 DB에 저장' }).click()
  await page.getByRole('textbox', { name: '거래처 검색', exact: true }).fill('정상추가상사')
  await page.getByRole('cell', { name: '정상추가상사', exact: true }).waitFor()
  await page.getByRole('textbox', { name: '거래처 검색', exact: true }).fill('엑셀테스트상사')
  assert.equal(await page.getByRole('cell', { name: '엑셀테스트상사', exact: true }).count(), 2)
  await page.getByRole('cell', { name: '엑셀테스트상사', exact: true }).last().click()
  await detail.getByText(/사업자등록번호·업종코드·업태·업종이 모두 같은/).waitFor()
  page.on('dialog', dialog => dialog.accept())
  await page.reload()
  await page.getByRole('textbox', { name: '거래처 검색', exact: true }).fill('엑셀테스트상사')
  await page.getByRole('cell', { name: '엑셀테스트상사', exact: true }).first().waitFor()
  assert.equal(await page.getByRole('cell', { name: '엑셀테스트상사', exact: true }).count(), 2)
  assert.deepEqual(errors, [])
  console.log('PASS: 15 columns, XLS import, error filter, failed-save retry ID, register all, retained issues, details, tab retention, mobile, persistent reload and hydration (mock API)')
} finally { await browser.close() }

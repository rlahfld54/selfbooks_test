import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const base = new URL(process.env.SELFBOOKS_TEST_URL ?? 'https://pages-preview.test/selfbooks_test/')
const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const browser = await chromium.launch({ executablePath: process.env.SELFBOOKS_BROWSER })

try {
  const page = await browser.newPage()
  if (!process.env.SELFBOOKS_TEST_URL) {
    await page.route(url => url.origin === base.origin, async route => {
      const { pathname } = new URL(route.request().url())
      const relative = pathname.slice(base.pathname.length)
      const file = extname(relative) ? resolve(root, relative) : resolve(root, relative, 'index.html')
      if (pathname.startsWith(base.pathname) && file.startsWith(root + sep) &&
          (await stat(file).catch(() => null))?.isFile()) {
        await route.fulfill({ path: file })
      } else {
        await route.fulfill({ status: 404 })
      }
    })
  }
  const errors = []
  const apiCalls = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/hydration/i.test(message.text()) && ['error', 'warning'].includes(message.type())) {
      errors.push(message.text())
    }
  })
  page.on('request', request => {
    if (['fetch', 'xhr'].includes(request.resourceType()) &&
        (!request.url().startsWith(base.href) || /\/api\//.test(new URL(request.url()).pathname))) {
      apiCalls.push(request.url())
    }
  })
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.origin === base.origin && !response.ok() && response.status() !== 304) {
      errors.push(`${response.status()} ${url.pathname}`)
    }
  })

  async function visit(path, title) {
    const response = await page.goto(new URL(path, base).href)
    assert.equal(response.status(), 200)
    await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false)
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
  }

  await visit('', '홈 대시보드')
  const icon = await page.locator('link[rel="icon"]').getAttribute('href')
  assert.equal(icon, new URL('favicon.ico', base).pathname)
  if (process.env.SELFBOOKS_TEST_URL) {
    assert.equal((await page.request.get(new URL(icon, base).href)).status(), 200)
  } else {
    assert.ok((await stat(resolve(root, 'favicon.ico'))).isFile())
  }
  await page.getByRole('button', { name: '일반전표입력', exact: true }).first().click()
  await page.waitForURL(new URL('journal', base).href)
  assert.equal((await page.reload()).status(), 200)

  await visit('client-directory/', '수임업체관리')
  await page.getByRole('row', { name: /샘플 문구점/ }).click()
  await page.locator('dd').filter({ hasText: '샘플 문구점' }).waitFor()

  await visit('sales-journal/', '매입매출전표입력')
  await page.getByRole('row', { name: /사무용품/ }).click()
  assert.equal(await page.getByPlaceholder('전표에 남길 내용을 입력하세요').inputValue(), '공개 미리보기용 샘플 전표')
  const writeButtons = await page.getByRole('button', { name: /^(저장|삭제)$/ }).all()
  assert.equal(writeButtons.length, 3)
  for (const button of writeButtons) {
    assert.equal(await button.isDisabled(), true)
  }
  assert.deepEqual(apiCalls, [])
  assert.deepEqual(errors, [])
  console.log('PASS GitHub Pages routing, assets, sample data and disabled writes')
} finally {
  await browser.close()
}

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

  await visit('dashboard/', '홈 대시보드')
  await page.getByLabel('환경설정 닫기', { exact: true }).click()
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

  await visit('client-directory/', '수임업체 관리')
  assert.equal(await page.locator('.management .stats > .stat').count(), 4)
  await page.getByRole('textbox', { name: '업체명 검색', exact: true }).fill('존재하지않는업체')
  await page.getByText('검색 조건에 맞는 수임업체가 없습니다.', { exact: false }).waitFor()
  await page.getByRole('button', { name: /초기화/ }).click()
  await page.getByRole('button', { name: '한빛디자인 상세 보기', exact: true }).click()
  const clientDetails = page.getByRole('dialog', { name: '한빛디자인', exact: true })
  await clientDetails.getByRole('heading', { name: '설정 진행 상태', exact: true }).waitFor()
  await clientDetails.getByRole('button', { name: '담당자 지정', exact: true }).click()
  const assignment = page.getByRole('dialog', { name: '담당자 지정 · 한빛디자인', exact: true })
  await assignment.waitFor()
  await page.keyboard.press('Escape')
  await assignment.waitFor({ state: 'hidden' })
  await clientDetails.getByRole('button', { name: '닫기', exact: true }).click()
  await page.getByRole('button', { name: /수임업체 등록/ }).click()
  const registration = page.getByRole('dialog', { name: '수임업체 등록', exact: true })
  await registration.getByRole('button', { name: '확인', exact: true }).click()
  await registration.getByRole('alert').waitFor()
  await registration.getByRole('button', { name: '취소', exact: true }).click()
  await page.getByRole('link', { name: '등록된 수임업체 조회', exact: true }).click()
  await page.getByRole('row', { name: /샘플 문구점/ }).click()
  await page.locator('dd').filter({ hasText: '샘플 문구점' }).waitFor()
  await visit('organization/', '조직 설정')
  await page.getByRole('heading', { name: '사업자 정보', exact: true }).waitFor()
  await page.getByRole('button', { name: '직원 관리', exact: true }).click()
  await page.getByRole('button', { name: '이수현 상세 보기', exact: true }).click()
  await page.getByRole('dialog', { name: '이수현', exact: true }).getByRole('link', { name: /한빛디자인/ }).click()
  await page.getByRole('dialog', { name: '한빛디자인', exact: true }).waitFor()
  await visit('mypage/', '마이페이지')
  const email = page.getByLabel('이메일', { exact: true })
  assert.equal(await email.isDisabled(), true)
  await page.getByRole('button', { name: /정보 수정/ }).click()
  await email.fill('잘못된-메일')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await page.getByText('이름과 올바른 이메일을 입력해 주세요.', { exact: true }).waitFor()
  await email.fill('wonji.updated@aat-demo.example')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  assert.equal(await email.inputValue(), 'wonji.updated@aat-demo.example')
  assert.equal(await email.isDisabled(), true)
  await visit('company/', '회사등록')
  await page.getByRole('button', { name: '수임업체 관리 →', exact: true }).waitFor()
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


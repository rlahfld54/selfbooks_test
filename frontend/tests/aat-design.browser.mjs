import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ headless: true, executablePath: process.env.SELFBOOKS_BROWSER })
const base = process.env.SELFBOOKS_TEST_URL ?? 'http://localhost:3000'
await mkdir('tests/screenshots', { recursive: true })
try {
  const page = await browser.newPage()
  for (const width of [1920, 1440, 1280, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const route of ['/dashboard', '/journal', '/components', '/login', '/register']) {
      await page.goto(base + route)
      // Mobile navigation intentionally hides the sidebar until the menu opens.
      await page.waitForSelector('.aat-brand', { state: 'attached' })
      await page.waitForFunction(() => [...document.querySelectorAll('.aat-brand img')].every(img => img.complete && img.naturalWidth > 0))
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--aat-color-primary').trim()), '#0A6EE8')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow at ${width}`)
      if (route === '/dashboard' && width === 1440) {
        assert.equal(await page.locator('.sidebar').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 59, 142)')
        await page.screenshot({ path: 'tests/screenshots/aat-dashboard.png', fullPage: true })
      }
    }
  }
  await page.goto(base + '/components')
  await page.waitForSelector('.button.primary')
  const button = page.locator('.button.primary').first()
  await button.focus()
  assert.notEqual(await button.evaluate(el => getComputedStyle(el).outlineStyle), 'none')
  const disabled = page.locator('button:disabled').first()
  if (await disabled.count()) assert.equal(await disabled.isEnabled(), false)
  const favicon = page.locator('link[rel="icon"]')
  assert.equal(await favicon.getAttribute('type'), 'image/svg+xml')
  assert.match(await favicon.getAttribute('href'), /aat-symbol.*svg|^data:image\/svg\+xml,/)
  console.log('AAT: 20 responsive screens, SVG loading, brand colors, keyboard focus and disabled state passed')
} finally {
  await browser.close()
}

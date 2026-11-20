import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compileTemplate, parse } from 'vue/compiler-sfc'

for (const filename of ['VoucherGrid.vue', 'VoucherDetail.vue', 'VoucherView.vue']) {
  test(`${filename} template compiles without expression errors`, () => {
    const source = readFileSync(new URL(`../app/features/vouchers/${filename}`, import.meta.url), 'utf8')
    const { descriptor, errors } = parse(source)
    assert.deepEqual(errors, [])
    assert.ok(descriptor.template)
    const result = compileTemplate({ source: descriptor.template.content, filename, id: filename })
    assert.deepEqual(result.errors, [])
  })
}

test('template compiler catches newline-separated inline event statements', () => {
  const result = compileTemplate({
    source: `<button @click="select(row)\nstart(row)">Edit</button>`,
    filename: 'InvalidClick.vue',
    id: 'invalid-click',
  })
  assert.ok(result.errors.length > 0)
})

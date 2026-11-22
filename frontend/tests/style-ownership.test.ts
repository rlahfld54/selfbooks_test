import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
import test from 'node:test'
import { parse } from '@vue/compiler-sfc'

const app = fileURLToPath(new URL('../app', import.meta.url))
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = join(directory, entry.name)
    return entry.isDirectory() ? files(name) : [name]
  })
}

test('main.css owns application styles and explicit scopes have matching markup', () => {
  const all = files(app)
  assert.deepEqual(all.filter(f => f.endsWith('.css')).map(f => relative(app, f).replaceAll('\\', '/')), ['assets/css/main.css'])
  const markup: string[] = []
  for (const filename of all.filter(f => f.endsWith('.vue'))) {
    const source = readFileSync(filename, 'utf8')
    const { descriptor } = parse(source, { filename })
    assert.equal(descriptor.styles.length, 0, filename)
    assert.doesNotMatch(descriptor.template?.content || '', /(?<![:\w-])style\s*=/, filename)
    markup.push(descriptor.template?.content || '')
  }
  const css = readFileSync(join(app, 'assets/css/main.css'), 'utf8')
  assert.doesNotMatch(css, /\[data-v-/)
  const templates = markup.join('\n')
  for (const scope of new Set([...css.matchAll(/\[(data-ui-[\w-]+)\]/g)].map(match => match[1]))) {
    assert.ok(templates.includes(` ${scope}`), `Missing template scope: ${scope}`)
  }
})

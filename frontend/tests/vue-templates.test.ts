import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import test from 'node:test'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

function vueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? vueFiles(path) : path.endsWith('.vue') ? [path] : []
  })
}

test('all page components compile, including named action slots', () => {
  const failures: string[] = []
  for (const filename of vueFiles(fileURLToPath(new URL('../app', import.meta.url)))) {
    try {
      const { descriptor, errors } = parse(readFileSync(filename, 'utf8'), { filename })
      assert.equal(errors.length, 0)
      if (!descriptor.template) continue
      const bindings = descriptor.scriptSetup ? compileScript(descriptor, { id: filename }).bindings : {}
      const result = compileTemplate({
        source: descriptor.template.content, filename, id: filename,
        compilerOptions: { bindingMetadata: bindings },
      })
      assert.deepEqual(result.errors, [])
    } catch (error) {
      failures.push(`${filename}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  assert.deepEqual(failures, [])
})

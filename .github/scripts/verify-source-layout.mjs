import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
assert.equal(packageJson.name, '@flyfish-group/file-viewer-open-source')
const required = [
  'packages/core/src/index.ts',
  'packages/renderers/pdf/src/pdf.ts',
  'packages/renderers/word/src/index.ts',
  'packages/renderers/spreadsheet/src/spreadsheet/chartRenderer.ts',
  'packages/thumbnail/src/index.ts',
  'packages/build-support/build-browser-runtime.mjs',
  'apps/viewer-demo/package.json',
  'apps/component-demo/package.json',
  'docs/guide/faq.md',
  'test/core-options.spec.ts',
  'examples/vanilla-vite/package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml'
]
for (const path of required) assert(existsSync(join(root, path)), `Missing project source: ${path}`)
for (const framework of [
  'web',
  'vue3',
  'vue2.6',
  'vue2.7',
  'react',
  'react-legacy',
  'svelte',
  'jquery'
]) {
  assert(
    existsSync(join(root, 'packages/components', framework, 'src')),
    `Missing ${framework} component source`
  )
}
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 })
  .toString()
  .split('\0')
  .filter(Boolean)
for (const path of tracked) {
  assert(
    !/^(?:apps\/chrome-extension|\.release|\.agents|\.codex|\.aws|node_modules)(?:\/|$)/.test(path),
    `Private local material is tracked: ${path}`
  )
  if (/(?:^|\/)\.env(?:\.|$)/.test(path)) {
    assert.equal(
      path,
      'examples/vue2.6-cli3-office/.env.nginx',
      `Private environment file is tracked: ${path}`
    )
    assert.equal(
      readFileSync(join(root, path), 'utf8'),
      'VUE_APP_PREVIEW_API=/api\nVUE_APP_PUBLIC_PATH=./\n',
      'The public nginx example must contain only documented relative paths'
    )
  }
}
assert(
  !existsSync(join(root, '.github/runtime-distribution.json')),
  'An artifact-only control-tree policy cannot replace project source'
)
console.log(
  JSON.stringify({
    status: 'verified-complete-open-source-layout',
    trackedFiles: tracked.length,
    requiredSourceEntries: required.length
  })
)

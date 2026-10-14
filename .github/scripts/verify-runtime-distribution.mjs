import assert from 'node:assert/strict'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import {
  auditRuntimeOnlyControlFiles,
  auditRuntimeOnlyProjection
} from './runtime-only-projection.mjs'

const root = resolve(import.meta.dirname, '../..')
const indexPath = '.github/runtime-distribution.json'
const index = JSON.parse(await readFile(join(root, indexPath), 'utf8'))
assert.equal(index.schemaVersion, 1)
assert.equal(index.mode, 'runtime-only')
assert.equal(
  index.status,
  'reviewed',
  'The complete frozen package set must be verified before publication'
)
assert.deepEqual(
  Object.keys(index).sort(),
  [
    'schemaVersion',
    'mode',
    'status',
    'version',
    'sourceCommit',
    'privateReceiptSha256',
    'packageNames',
    'manifest',
    'files'
  ].sort()
)
const files = []
async function inspect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name
    if (name === '.git') continue
    const path = join(directory, entry.name)
    assert.ok(!entry.isSymbolicLink(), 'Public runtime tree must not contain symlinks')
    if (entry.isDirectory()) await inspect(path, name + '/')
    else {
      assert.ok(entry.isFile())
      if (name === indexPath) continue
      const info = await lstat(path)
      files.push({
        path: name,
        bytes: await readFile(path),
        mode: info.mode & 0o111 ? 0o100755 : 0o100644
      })
    }
  }
}
await inspect(root)
auditRuntimeOnlyControlFiles(files, index.files)
const result = auditRuntimeOnlyProjection(files, index)
console.log(JSON.stringify({ status: 'verified-runtime-only-distribution', ...result }))

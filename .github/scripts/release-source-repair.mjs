import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function readReleaseSourceRepair(root, releaseTag, manifestBytes) {
  let bytes
  try {
    bytes = await readFile(join(root, 'artifacts/release-source-repair.json'), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  const policy = JSON.parse(bytes)
  assert.deepEqual(Object.keys(policy).sort(), [
    'manifestSha256',
    'mode',
    'npmPublication',
    'originalSourceCommit',
    'schemaVersion',
    'version'
  ])
  assert.equal(policy.schemaVersion, 1)
  assert.equal(policy.mode, 'github-source-repair')
  assert.equal(policy.npmPublication, 'forbidden')
  assert.match(policy.version, /^\d+\.\d+\.\d+$/)
  assert.equal(releaseTag, `v${policy.version}`, 'Source repair release tag changed')
  assert.match(policy.originalSourceCommit, /^[a-f0-9]{40}$/)
  assert.equal(
    policy.manifestSha256,
    createHash('sha256').update(manifestBytes).digest('hex'),
    'Source repair frozen manifest changed'
  )
  return policy
}

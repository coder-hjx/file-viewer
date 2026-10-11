import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { reportEvidence } from './report-ci-evidence.mjs'

test('evidence reports actual JSON and binary identities without following a symlink outside output', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'file-viewer-ci-proof-'))
  try {
    await mkdir(join(cwd, 'output', 'proof'), { recursive: true })
    await writeFile(join(cwd, 'output', 'proof', 'report.json'), '{"status":"failed"}')
    await writeFile(join(cwd, 'output', 'proof', 'image.png'), new Uint8Array([1, 2, 3]))
    await mkdir(join(cwd, 'output', 'proof', 'node_modules'))
    await writeFile(
      join(cwd, 'output', 'proof', 'node_modules', 'package.json'),
      '{"mustNotRead":true}'
    )
    await mkdir(join(cwd, 'output', 'proof', '.npm-cache'))
    await writeFile(
      join(cwd, 'output', 'proof', '.npm-cache', 'cache.json'),
      '{"mustNotRead":true}'
    )
    await writeFile(join(cwd, 'output', 'proof', '.npmrc'), 'must-not-read')
    await writeFile(join(cwd, 'output', 'proof', 'package.tgz'), new Uint8Array([9]))
    await writeFile(join(cwd, 'private.json'), '{"mustNotRead":true}')
    await symlink(join(cwd, 'private.json'), join(cwd, 'output', 'proof', 'link.json'))
    await mkdir(join(cwd, 'private'))
    await writeFile(join(cwd, 'private', 'report.json'), '{"mustNotRead":true}')
    await symlink(join(cwd, 'private'), join(cwd, 'output', 'alias'))
    const rows = []
    await reportEvidence(['output/proof', 'output/missing', 'output/alias/report.json'], {
      cwd,
      emit: (row) => rows.push(row)
    })
    assert.equal(rows.find((row) => row.evidence?.endsWith('report.json')).report.status, 'failed')
    const image = rows.find((row) => row.evidence?.endsWith('image.png'))
    assert.equal(image.bytes, 3)
    assert.equal(image.sha256, '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81')
    assert.equal(Object.hasOwn(image, 'report'), false)
    assert.equal(
      rows.find((row) => row.evidence?.endsWith('link.json')).status,
      'symlink-not-followed'
    )
    assert.equal(rows.find((row) => row.evidence === 'output/missing').status, 'not-produced')
    assert.equal(
      rows.find((row) => row.evidence === 'output/alias/report.json').status,
      'outside-output-not-read'
    )
    assert.deepEqual(rows.at(-1).evidenceSummary, { files: 2, actionsStorageWrites: 0 })
    assert.equal(
      rows.some((row) => /node_modules|npm-cache|npmrc|package\.tgz/.test(row.evidence || '')),
      false
    )
    await assert.rejects(
      reportEvidence(['private.json'], { cwd, emit: () => {} }),
      /Only generated output/
    )
    await assert.rejects(
      reportEvidence(['../output'], { cwd, emit: () => {} }),
      /Only generated output/
    )
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('required evidence preserves the previous missing-artifact failure', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'file-viewer-required-proof-'))
  try {
    await mkdir(join(cwd, 'output', 'empty'), { recursive: true })
    const options = { cwd, requireFiles: true, emit: () => {} }
    await assert.rejects(reportEvidence(['output/missing'], options), /Required CI evidence/)
    await assert.rejects(reportEvidence(['output/empty'], options), /Required CI evidence/)
    await writeFile(join(cwd, 'output', 'empty', 'report.json'), '{"status":"passed"}')
    await reportEvidence(['output/missing', 'output/empty'], options)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('validation workflows retain checks without implicit package caches or artifact uploads', async () => {
  const directory = new URL('../workflows/', import.meta.url)
  for (const name of [
    'public-ci.yml',
    'security.yml',
    'geo3d-focused-validation.yml',
    'geo3d-branch-validation.yml'
  ]) {
    const source = await readFile(new URL(name, directory), 'utf8')
    assert.doesNotMatch(source, /uses:\s*actions\/(?:upload-artifact|cache)@/, name)
    assert.doesNotMatch(source, /^\s+cache:\s*\S/m, name)
    const setups = source
      .split(/\n\s+- name:/)
      .filter((step) => /uses: actions\/setup-node@/.test(step))
    for (const setup of setups) assert.match(setup, /package-manager-cache: false/, name)
    if (name.startsWith('geo3d-'))
      assert.match(source, /report-ci-evidence\.mjs --require-files/, name)
  }
})

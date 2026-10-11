import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readFile, readdir, realpath } from 'node:fs/promises'
import { resolve, relative, sep, basename, extname } from 'node:path'

// Proof files stay in the job; logs retain small JSON reports and identities
// for selected proof files without creating an Actions artifact or cache entry.
export async function reportEvidence(roots, options = {}) {
  const cwd = resolve(options.cwd || process.cwd())
  const realOutput = resolve(await realpath(cwd), 'output')
  const emit = options.emit || ((value) => console.log(JSON.stringify(value)))
  const jsonLimit = 128 * 1024
  let remainingJsonBytes = 1024 * 1024
  let count = 0
  const seen = new Set()
  const evidenceExtensions = new Set(['.json', '.log', '.txt', '.png', '.jpg', '.jpeg', '.webp'])
  async function visit(file) {
    const name = relative(cwd, file)
    if (name === '..' || name.startsWith('..' + sep) || !name)
      throw new Error('Evidence must be inside a named workspace output directory')
    const leaf = basename(file)
    if (leaf.startsWith('.') || ['node_modules', '_cacache', '_npx'].includes(leaf)) return
    if (seen.has(file)) return
    seen.add(file)
    let stat
    try {
      stat = await lstat(file)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      emit({ evidence: name, status: 'not-produced' })
      return
    }
    if (stat.isSymbolicLink()) {
      emit({ evidence: name, status: 'symlink-not-followed' })
      return
    }
    const actual = await realpath(file)
    if (!(actual === realOutput || actual.startsWith(realOutput + sep))) {
      emit({ evidence: name, status: 'outside-output-not-read' })
      return
    }
    if (stat.isDirectory()) {
      for (const child of (await readdir(file)).sort()) await visit(resolve(file, child))
      return
    }
    if (!stat.isFile()) return
    if (!evidenceExtensions.has(extname(file))) return
    const hash = createHash('sha256')
    let length = 0
    for await (const chunk of createReadStream(file)) {
      hash.update(chunk)
      length += chunk.length
    }
    const record = {
      evidence: name,
      bytes: length,
      sha256: hash.digest('hex')
    }
    if (file.endsWith('.json') && length <= jsonLimit && length <= remainingJsonBytes) {
      const bytes = await readFile(file)
      try {
        record.report = JSON.parse(bytes.toString('utf8'))
        remainingJsonBytes -= bytes.length
      } catch {
        record.reportStatus = 'invalid-json'
      }
    }
    emit(record)
    count++
  }
  for (const root of roots) {
    const file = resolve(cwd, root)
    const name = relative(cwd, file)
    if (!(name === 'output' || name.startsWith('output' + sep)))
      throw new Error('Only generated output evidence is eligible for reporting')
    await visit(file)
  }
  emit({ evidenceSummary: { files: count, actionsStorageWrites: 0 } })
  if (options.requireFiles && count === 0) throw new Error('Required CI evidence was not produced')
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const args = process.argv.slice(2)
  await reportEvidence(
    args.filter((arg) => arg !== '--require-files'),
    {
      requireFiles: args.includes('--require-files')
    }
  )
}

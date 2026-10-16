import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const workspaceRoot = resolve(import.meta.dirname, '../..')
const ownerManifestPath = resolve(workspaceRoot, 'packages/renderers/cad/package.json')
const ownerRequire = createRequire(ownerManifestPath)
const requiredFiles = ['dwg-worker.js', 'dwfv-render.wasm', 'libredwg-web.js', 'libredwg-web.wasm']
const notices = ['LICENSE', 'NOTICE']

/** Stage the ordinary installed CAD package, including its redistribution notices. */
export async function stageInstalledCadRuntime(targetRoot) {
  const owner = JSON.parse(await readFile(ownerManifestPath, 'utf8'))
  const manifestPath = ownerRequire.resolve('@flyfish-dev/cad-viewer/package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const coreAssets = await import(
    pathToFileURL(ownerRequire.resolve('@file-viewer/core/assets')).href
  )
  const version = coreAssets.DEFAULT_FILE_VIEWER_CAD_RUNTIME_VERSION
  assert.equal(manifest.name, '@flyfish-dev/cad-viewer')
  assert.equal(
    manifest.version,
    owner.dependencies[manifest.name],
    'Installed CAD version differs from its owner'
  )
  assert.equal(manifest.version, version, 'Installed CAD version differs from the asset contract')
  assert.match(version, /^\d+\.\d+\.\d+$/)
  const packageRoot = await realpath(dirname(manifestPath))
  const sourceRoot = join(packageRoot, 'dist/wasm')
  const target = resolve(targetRoot, 'wasm/cad')
  const sourceWithinTarget = relative(target, packageRoot)
  assert.ok(
    sourceWithinTarget.startsWith('..') || isAbsolute(sourceWithinTarget),
    'Refusing to stage over the installed CAD package'
  )
  const chunks = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^dwg-worker-.+\.js$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
  // Validate every owner file before writing. Bootstrap bytes cannot replace a
  // missing installed Worker, WASM or notice.
  const files = new Map()
  for (const filename of [...requiredFiles, ...chunks, ...notices]) {
    const source = join(notices.includes(filename) ? packageRoot : sourceRoot, filename)
    const info = await lstat(source)
    assert.ok(info.isFile() && info.size > 0, `Invalid installed CAD asset: ${filename}`)
    const bytes = await readFile(source)
    files.set(
      filename,
      filename.endsWith('.js')
        ? Buffer.from(
            bytes
              .toString('utf8')
              .replace(/^\s*\/\/[#@]\s*sourceMappingURL=.*$/gm, '')
              .trimEnd() + '\n'
          )
        : bytes
    )
  }
  const versioned = join(target, version)
  const existing = await lstat(target).catch((error) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  assert.ok(!existing || existing.isDirectory(), 'Unsafe CAD asset destination')
  await rm(versioned, { recursive: true, force: true })
  await mkdir(versioned, { recursive: true })
  const receipts = []
  for (const [filename, bytes] of files) {
    for (const directory of [target, versioned]) {
      const destination = join(directory, filename)
      const info = await lstat(destination).catch((error) => {
        if (error.code === 'ENOENT') return undefined
        throw error
      })
      assert.ok(!info || info.isFile(), `Unsafe CAD asset destination: ${filename}`)
      if (filename.endsWith('.js')) await writeFile(destination, bytes)
      else
        await copyFile(
          join(packageRoot, notices.includes(filename) ? filename : `dist/wasm/${filename}`),
          destination
        )
      assert.ok(bytes.equals(await readFile(destination)))
    }
    receipts.push({
      filename,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex')
    })
  }
  // Legacy version directories are retained; only current unversioned entries
  // and the exact version owned by this installed package are refreshed.
  return { sourcePackage: manifest.name, sourceVersion: manifest.version, files: receipts }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Pass the asset output directory')
  console.log(JSON.stringify(await stageInstalledCadRuntime(resolve(process.argv[2])), null, 2))
}

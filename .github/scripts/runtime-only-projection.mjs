import { createHash } from 'node:crypto'

const forbiddenPublicPath =
  /(?:^|\/)(?:packages|apps|examples|src|source|test|tests|fixtures|patches|evidence|reports|node_modules|\.release)(?:\/|$)/i
const publicRoles = new Set([
  'publisher',
  'workflow',
  'consumer',
  'manifest',
  'legal',
  'documentation',
  'governance'
])
const manifestFields = new Set([
  'schemaVersion',
  'mode',
  'version',
  'sourceCommit',
  'privateReceiptSha256',
  'packageCount',
  'packages'
])
const packageFields = new Set([
  'packageName',
  'version',
  'tarball',
  'sha256',
  'integrity',
  'tarballSize',
  'fileCount',
  'license',
  'releaseArtifact'
])
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const stableVersion = /^\d+\.\d+\.\d+$/
const forbiddenFile =
  /(?:\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)(?:[^/]*[._-])?(?:pocs?|reports?|evidence)(?:[._-]|$))/i

function assertRelativePath(path) {
  if (
    typeof path !== 'string' ||
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((part) => !part || part === '.' || part === '..') ||
    /[\x00-\x1f\x7f:*?]/.test(path)
  ) {
    throw new Error('Invalid runtime-only public path')
  }
}

export function runtimeOnlyPublicManifest({
  version,
  sourceCommit,
  privateReceiptSha256,
  packages
}) {
  const result = {
    schemaVersion: 1,
    mode: 'runtime-only',
    version,
    sourceCommit,
    privateReceiptSha256,
    packageCount: packages.length,
    packages: packages.map((entry) => ({
      ...Object.fromEntries(
        Object.entries(entry).filter(([key]) => packageFields.has(key) && key !== 'releaseArtifact')
      ),
      releaseArtifact: { includeTarball: entry.releaseArtifact?.includeTarball }
    }))
  }
  assertRuntimeOnlyPublicManifest(result, {
    version,
    sourceCommit,
    privateReceiptSha256,
    packageNames: packages.map((entry) => entry.packageName)
  })
  return result
}

export function assertRuntimeOnlyPublicManifest(manifest, expected) {
  if (
    manifest.schemaVersion !== 1 ||
    manifest.mode !== 'runtime-only' ||
    !stableVersion.test(manifest.version) ||
    manifest.version !== expected.version ||
    manifest.sourceCommit !== expected.sourceCommit ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit || '') ||
    !/^[a-f0-9]{64}$/.test(manifest.privateReceiptSha256 || '') ||
    manifest.privateReceiptSha256 !== expected.privateReceiptSha256 ||
    Object.keys(manifest).some((key) => !manifestFields.has(key))
  ) {
    throw new Error(
      'Runtime-only public manifest has drifted or contains private maintenance metadata'
    )
  }
  if (
    !Array.isArray(manifest.packages) ||
    manifest.packages.length !== manifest.packageCount ||
    manifest.packageCount !== expected.packageNames.length ||
    !manifest.packageCount ||
    new Set(expected.packageNames).size !== expected.packageNames.length
  ) {
    throw new Error('Runtime-only public package count is inconsistent')
  }
  const names = new Set()
  const archives = new Set()
  for (const entry of manifest.packages) {
    if (
      Object.keys(entry).some((key) => !packageFields.has(key)) ||
      !expected.packageNames.includes(entry.packageName) ||
      names.has(entry.packageName) ||
      !stableVersion.test(entry.version) ||
      !entry.license ||
      !/^[a-f0-9]{64}$/.test(entry.sha256 || '') ||
      !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity || '') ||
      !Number.isSafeInteger(entry.tarballSize) ||
      entry.tarballSize <= 0 ||
      !Number.isSafeInteger(entry.fileCount) ||
      entry.fileCount <= 0 ||
      !/^[A-Za-z0-9._-]+\.tgz$/.test(entry.tarball || '') ||
      archives.has(entry.tarball) ||
      entry.releaseArtifact?.includeTarball !== true ||
      Object.keys(entry.releaseArtifact).length !== 1
    ) {
      throw new Error(
        'Runtime-only public package identity, license or frozen bytes are inconsistent'
      )
    }
    names.add(entry.packageName)
    archives.add(entry.tarball)
  }
  return manifest
}

export function assertRuntimeOnlyProjectionPolicy(policy) {
  if (
    !policy ||
    policy.schemaVersion !== 1 ||
    policy.mode !== 'runtime-only' ||
    policy.status !== 'reviewed' ||
    !Array.isArray(policy.files) ||
    !policy.files.length ||
    !policy.manifest ||
    !/^[a-f0-9]{64}$/.test(policy.manifest.sha256 || '') ||
    !Array.isArray(policy.packageNames)
  ) {
    throw new Error('Runtime-only projection requires a reviewed distribution-tree policy')
  }
  const files = new Set()
  for (const entry of policy.files) {
    assertRelativePath(entry.path)
    if (
      files.has(entry.path) ||
      forbiddenPublicPath.test(entry.path) ||
      forbiddenFile.test(entry.path) ||
      /\.(?:map|ts|tsx|rs|c|cpp|h|patch|diff|tgz|tar|gz|zip|wasm)$/i.test(entry.path) ||
      !publicRoles.has(entry.role) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256 || '') ||
      ![0o100644, 0o100755].includes(entry.mode)
    ) {
      throw new Error(
        'Runtime-only projection contains source, evidence, binaries or an unreviewed control file'
      )
    }
    files.add(entry.path)
  }
  if (
    !files.has(policy.manifest.path) ||
    policy.files.find((file) => file.path === policy.manifest.path)?.role !== 'manifest'
  ) {
    throw new Error('Runtime-only public manifest is not indexed in the distribution policy')
  }
  return policy
}

export function auditRuntimeOnlyControlFiles(publicFiles, expectedFiles) {
  if (
    !Array.isArray(publicFiles) ||
    !Array.isArray(expectedFiles) ||
    publicFiles.length !== expectedFiles.length ||
    new Set(publicFiles.map((file) => file.path)).size !== publicFiles.length
  ) {
    throw new Error('Runtime-only control tree differs from its exact allowlist')
  }
  const expected = new Map(expectedFiles.map((file) => [file.path, file]))
  for (const file of publicFiles) {
    assertRelativePath(file.path)
    const entry = expected.get(file.path)
    if (
      !entry ||
      forbiddenPublicPath.test(file.path) ||
      forbiddenFile.test(file.path) ||
      /\.(?:map|ts|tsx|rs|c|cpp|h|patch|diff|tgz|tar|gz|zip|wasm)$/i.test(file.path) ||
      !publicRoles.has(entry.role) ||
      file.mode !== entry.mode ||
      sha256(file.bytes) !== entry.sha256 ||
      /(?:\/Users\/|\/home\/|\/Documents\/Codex\/|\/\.release\/|(?:^|\n)\s*\/\/[#@]\s*sourceMappingURL=)/.test(
        file.bytes.toString('utf8')
      )
    ) {
      throw new Error(
        'Runtime-only control tree contains private source, evidence, maps or unreviewed bytes'
      )
    }
  }
  return { mode: 'runtime-only', files: publicFiles.length }
}

export function auditRuntimeOnlyProjection(publicFiles, policy) {
  assertRuntimeOnlyProjectionPolicy(policy)
  if (
    !Array.isArray(publicFiles) ||
    publicFiles.length !== policy.files.length ||
    new Set(publicFiles.map((file) => file.path)).size !== publicFiles.length
  ) {
    throw new Error('Runtime-only public tree differs from the exact reviewed control tree')
  }
  const expected = new Map(policy.files.map((file) => [file.path, file]))
  for (const file of publicFiles) {
    const entry = expected.get(file.path)
    if (!entry || file.mode !== entry.mode || sha256(file.bytes) !== entry.sha256) {
      throw new Error('Runtime-only public tree contains missing, extra or altered bytes/modes')
    }
  }
  const manifest = publicFiles.find((file) => file.path === policy.manifest.path)
  if (sha256(manifest.bytes) !== policy.manifest.sha256)
    throw new Error('Runtime-only public manifest digest changed')
  assertRuntimeOnlyPublicManifest(JSON.parse(manifest.bytes.toString('utf8')), policy)
  return {
    mode: 'runtime-only',
    sourceCommit: policy.sourceCommit,
    files: publicFiles.length,
    packageCount: policy.packageNames.length
  }
}

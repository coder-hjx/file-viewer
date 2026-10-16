import { computed, readonly, ref, shallowRef } from 'vue'
import type { ComputedRef, DeepReadonly, Ref, ShallowRef } from 'vue'

export const DEMO_RECENT_FILES_STORAGE_KEY = 'file-viewer-demo:recent-files'
export const DEMO_RECENT_FILES_STORAGE_VERSION = 1
export const DEFAULT_DEMO_RECENT_FILES_LIMIT = 8

export type DemoRecentFileSource = 'url' | 'sample' | 'local'

/**
 * Serializable metadata for one recently opened file.
 *
 * Local files intentionally keep only metadata. Their optional runtime URL is
 * available for the current page lifetime, but is removed before persistence.
 */
export interface DemoRecentFile {
  readonly id: string
  readonly name: string
  readonly url: string | null
  readonly type: string
  readonly iconTarget: string
  readonly timestamp: number
  readonly source: DemoRecentFileSource
  readonly size?: number
  readonly lastModified?: number
}

export interface DemoRecentFileInput {
  name?: string
  url?: string | null
  type?: string
  iconTarget?: string
  source: DemoRecentFileSource
  size?: number
  lastModified?: number
}

export interface DemoLocalFileMetadata {
  name: string
  type?: string
  size?: number
  lastModified?: number
}

export interface DemoLocalFileOptions {
  /** A blob URL may be reused during this page lifetime, but is never persisted. */
  runtimeUrl?: string | null
  iconTarget?: string
}

export interface UseDemoRecentFilesOptions {
  storage?: Storage | null
  storageKey?: string
  maxItems?: number
  now?: () => number
}

export interface UseDemoRecentFilesApi {
  recentFiles: DeepReadonly<Ref<DemoRecentFile[]>>
  hasRecentFiles: ComputedRef<boolean>
  storageError: Readonly<ShallowRef<unknown | null>>
  rememberRecentFile: (input: DemoRecentFileInput) => DemoRecentFile | null
  rememberUrl: (input: Omit<DemoRecentFileInput, 'source'>) => DemoRecentFile | null
  rememberSample: (input: Omit<DemoRecentFileInput, 'source'>) => DemoRecentFile | null
  rememberLocalFile: (
    file: DemoLocalFileMetadata,
    options?: DemoLocalFileOptions
  ) => DemoRecentFile | null
  dismissRecentFile: (fileOrId: DemoRecentFile | string) => boolean
  clearRecentFiles: () => void
  reloadRecentFiles: () => DemoRecentFile[]
  clearStorageError: () => void
}

interface StoredRecentFiles {
  version: typeof DEMO_RECENT_FILES_STORAGE_VERSION
  items: DemoRecentFile[]
}

const VALID_SOURCES = new Set<DemoRecentFileSource>(['url', 'sample', 'local'])
const MAX_NAME_LENGTH = 512
const MAX_TYPE_LENGTH = 256
const MAX_URL_LENGTH = 8192
const MAX_ICON_TARGET_LENGTH = 8192
const MAX_HISTORY_LIMIT = 50
const MAX_FUTURE_TIMESTAMP_SKEW_MS = 5 * 60 * 1000

// Stored history is untrusted input. Normalize shape and bound every string,
// number and collection before it reaches the UI.
const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const cleanString = (value: unknown, maxLength: number): string => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
)

const cleanOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined
  }
  return value
}

const inferNameFromUrl = (url: string): string => {
  const withoutQuery = url.split(/[?#]/, 1)[0] || ''
  const encodedName = withoutQuery.split('/').filter(Boolean).at(-1) || ''
  if (!encodedName) {
    return ''
  }
  try {
    return decodeURIComponent(encodedName)
  } catch {
    return encodedName
  }
}

const inferTypeFromTarget = (target: string): string => {
  const cleanTarget = target.split(/[?#]/, 1)[0] || ''
  const name = cleanTarget.split('/').at(-1) || cleanTarget
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > -1 && dotIndex < name.length - 1
    ? name.slice(dotIndex + 1).toLowerCase()
    : ''
}

const normalizeLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_DEMO_RECENT_FILES_LIMIT
  }
  return Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.floor(value)))
}

const normalizeUrlIdentity = (url: string): string => {
  const hashIndex = url.indexOf('#')
  return hashIndex >= 0 ? url.slice(0, hashIndex) : url
}

const recentFileIdentity = (file: Pick<
  DemoRecentFile,
  'name' | 'url' | 'type' | 'source' | 'size' | 'lastModified'
>): string => {
  if (file.source !== 'local' && file.url) {
    // A sample later opened through the URL field is still the same recent file.
    return `remote:${normalizeUrlIdentity(file.url)}`
  }

  if (file.source === 'local') {
    return [
      'local',
      file.name.toLowerCase(),
      file.type.toLowerCase(),
      file.size ?? '',
      file.lastModified ?? ''
    ].join(':')
  }

  return [file.source, file.name.toLowerCase(), file.type.toLowerCase()].join(':')
}

const stableId = (identity: string): string => {
  let hash = 0x811c9dc5
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `recent-${(hash >>> 0).toString(36)}`
}

const normalizeTimestamp = (value: unknown, now: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return now
  }
  return Math.min(Math.floor(value), now + MAX_FUTURE_TIMESTAMP_SKEW_MS)
}

const normalizeRecentFile = (
  value: unknown,
  now: number,
  preserveLocalRuntimeUrl: boolean
): DemoRecentFile | null => {
  if (!isRecord(value) || !VALID_SOURCES.has(value.source as DemoRecentFileSource)) {
    return null
  }

  const source = value.source as DemoRecentFileSource
  const rawUrl = cleanString(value.url, MAX_URL_LENGTH)
  const url = source === 'local' && !preserveLocalRuntimeUrl ? null : rawUrl || null
  const name = cleanString(value.name, MAX_NAME_LENGTH) || (url ? inferNameFromUrl(url) : '')

  if (!name || (source !== 'local' && !url)) {
    return null
  }

  const type = cleanString(value.type, MAX_TYPE_LENGTH)
    || inferTypeFromTarget(name)
  const iconTarget = cleanString(value.iconTarget, MAX_ICON_TARGET_LENGTH)
    || (source === 'local' ? name : url)
    || name
  const size = cleanOptionalNumber(value.size)
  const lastModified = cleanOptionalNumber(value.lastModified)
  const normalized = {
    name,
    url,
    type,
    iconTarget,
    timestamp: normalizeTimestamp(value.timestamp, now),
    source,
    ...(size === undefined ? {} : { size }),
    ...(lastModified === undefined ? {} : { lastModified })
  }

  return {
    id: stableId(recentFileIdentity(normalized)),
    ...normalized
  }
}

const normalizeRecentFiles = (
  values: unknown[],
  maxItems: number,
  now: number
): DemoRecentFile[] => {
  // Sort first, then deduplicate, so the newest representation of a file wins
  // even when older app versions stored repeated entries.
  const normalized = values
    .map((value, index) => ({
      file: normalizeRecentFile(value, now, false),
      index
    }))
    .filter((item): item is { file: DemoRecentFile; index: number } => Boolean(item.file))
    .sort((left, right) => (
      right.file.timestamp - left.file.timestamp || left.index - right.index
    ))

  const identities = new Set<string>()
  const result: DemoRecentFile[] = []
  for (const { file } of normalized) {
    const identity = recentFileIdentity(file)
    if (identities.has(identity)) {
      continue
    }
    identities.add(identity)
    result.push(file)
    if (result.length >= maxItems) {
      break
    }
  }
  return result
}

const resolveDefaultStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function useDemoRecentFiles(
  options: UseDemoRecentFilesOptions = {}
): UseDemoRecentFilesApi {
  /**
   * Recent history has three failure-tolerant layers:
   *
   * 1. sanitize and version data read from storage;
   * 2. expose an immutable reactive list to the shell;
   * 3. keep local File/blob access outside persistence.
   */
  const maxItems = normalizeLimit(options.maxItems)
  const storageKey = options.storageKey || DEMO_RECENT_FILES_STORAGE_KEY
  const storage = options.storage === undefined ? resolveDefaultStorage() : options.storage
  const now = options.now || Date.now
  const recentFilesState = ref<DemoRecentFile[]>([])
  const storageErrorState = shallowRef<unknown | null>(null)

  function readStorage(): DemoRecentFile[] {
    if (!storage) {
      return []
    }

    try {
      const serialized = storage.getItem(storageKey)
      storageErrorState.value = null
      if (!serialized) {
        return []
      }
      const parsed: unknown = JSON.parse(serialized)
      if (
        !isRecord(parsed)
        || parsed.version !== DEMO_RECENT_FILES_STORAGE_VERSION
        || !Array.isArray(parsed.items)
      ) {
        return []
      }
      return normalizeRecentFiles(parsed.items, maxItems, now())
    } catch (error) {
      storageErrorState.value = error
      return []
    }
  }

  function persist(items: DemoRecentFile[]) {
    if (!storage) {
      return
    }

    const persistedItems = items.map(file => (
      file.source === 'local' && file.url
        ? { ...file, url: null }
        : file
    ))
    const payload: StoredRecentFiles = {
      version: DEMO_RECENT_FILES_STORAGE_VERSION,
      items: persistedItems
    }

    try {
      storage.setItem(storageKey, JSON.stringify(payload))
      storageErrorState.value = null
    } catch (error) {
      storageErrorState.value = error
    }
  }

  function reloadRecentFiles(): DemoRecentFile[] {
    recentFilesState.value = readStorage()
    return recentFilesState.value
  }

  function rememberRecentFile(input: DemoRecentFileInput): DemoRecentFile | null {
    const latestTimestamp = recentFilesState.value.reduce(
      (latest, file) => Math.max(latest, file.timestamp),
      0
    )
    const currentNow = now()
    const file = normalizeRecentFile({
      ...input,
      timestamp: Math.max(currentNow, latestTimestamp + 1)
    }, currentNow, true)

    if (!file) {
      return null
    }

    const identity = recentFileIdentity(file)
    recentFilesState.value = [
      file,
      ...recentFilesState.value.filter(item => recentFileIdentity(item) !== identity)
    ].slice(0, maxItems)
    persist(recentFilesState.value)
    return file
  }

  function rememberUrl(input: Omit<DemoRecentFileInput, 'source'>) {
    return rememberRecentFile({ ...input, source: 'url' })
  }

  function rememberSample(input: Omit<DemoRecentFileInput, 'source'>) {
    return rememberRecentFile({ ...input, source: 'sample' })
  }

  function rememberLocalFile(
    file: DemoLocalFileMetadata,
    localOptions: DemoLocalFileOptions = {}
  ) {
    return rememberRecentFile({
      name: file.name,
      url: localOptions.runtimeUrl,
      type: file.type,
      iconTarget: localOptions.iconTarget || file.name,
      source: 'local',
      size: file.size,
      lastModified: file.lastModified
    })
  }

  function dismissRecentFile(fileOrId: DemoRecentFile | string): boolean {
    const id = typeof fileOrId === 'string' ? fileOrId : fileOrId.id
    const next = recentFilesState.value.filter(file => file.id !== id)
    if (next.length === recentFilesState.value.length) {
      return false
    }
    recentFilesState.value = next
    persist(next)
    return true
  }

  function clearRecentFiles() {
    recentFilesState.value = []
    if (!storage) {
      return
    }
    try {
      storage.removeItem(storageKey)
      storageErrorState.value = null
    } catch (error) {
      storageErrorState.value = error
    }
  }

  function clearStorageError() {
    storageErrorState.value = null
  }

  reloadRecentFiles()

  return {
    recentFiles: readonly(recentFilesState),
    hasRecentFiles: computed(() => recentFilesState.value.length > 0),
    storageError: readonly(storageErrorState),
    rememberRecentFile,
    rememberUrl,
    rememberSample,
    rememberLocalFile,
    dismissRecentFile,
    clearRecentFiles,
    reloadRecentFiles,
    clearStorageError
  }
}

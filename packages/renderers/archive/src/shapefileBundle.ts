import {
  getArchiveEntryExtension,
  type ArchiveEntryView,
} from './archiveShared.js';

const SHAPEFILE_COMPONENT_EXTENSIONS = new Set([
  'shp',
  'shx',
  'dbf',
  'prj',
  'cpg',
]);

const SHAPEFILE_COMPONENT_ORDER = new Map([
  ['shp', 0],
  ['dbf', 1],
  ['shx', 2],
  ['prj', 3],
  ['cpg', 4],
]);

interface ArchivePathParts {
  directory: string;
  filename: string;
  stem: string;
  extension: string;
}

type JSZipWriter = {
  file(name: string, data: ArrayBuffer): JSZipWriter;
  generateAsync(options: {
    type: 'arraybuffer';
    compression: 'STORE';
  }): Promise<ArrayBuffer>;
};

type JSZipWriterConstructor = new () => JSZipWriter;

const normalizeArchivePath = (path: string) => path
  .replace(/^\/+/, '')
  .replace(/\\/g, '/');

const getArchivePathParts = (path: string): ArchivePathParts => {
  const normalized = normalizeArchivePath(path);
  const slash = normalized.lastIndexOf('/');
  const directory = slash === -1 ? '' : normalized.slice(0, slash);
  const filename = slash === -1 ? normalized : normalized.slice(slash + 1);
  const extension = getArchiveEntryExtension(filename);
  const stem = extension
    ? filename.slice(0, -(extension.length + 1))
    : filename;

  return {
    directory: directory.toLowerCase(),
    filename,
    stem: stem.toLowerCase(),
    extension,
  };
};

const resolveJSZipWriter = (module: unknown): JSZipWriterConstructor => {
  const record = module as Record<string, unknown> | undefined;
  const defaultRecord = record?.default as Record<string, unknown> | undefined;
  const candidates = [
    record?.default,
    defaultRecord?.default,
    record?.JSZip,
    module,
  ];
  const constructor = candidates.find(candidate => typeof candidate === 'function');

  if (!constructor) {
    throw new Error('JSZip module does not expose a constructor.');
  }
  return constructor as JSZipWriterConstructor;
};

/**
 * Finds the files that form the selected Shapefile dataset. Shapefile
 * sidecars are matched case-insensitively by directory and basename so an
 * archive containing multiple datasets never leaks attributes or projection
 * metadata from a neighbouring dataset into the preview.
 */
export const getShapefileBundleEntries = (
  entries: readonly ArchiveEntryView[],
  selectedEntry: ArchiveEntryView
) => {
  const selected = getArchivePathParts(selectedEntry.path);
  if (selected.extension !== 'shp') {
    return [];
  }

  return entries
    .filter(entry => {
      const candidate = getArchivePathParts(entry.path);
      return candidate.directory === selected.directory &&
        candidate.stem === selected.stem &&
        SHAPEFILE_COMPONENT_EXTENSIONS.has(candidate.extension);
    })
    .sort((left, right) => {
      const leftExtension = getArchivePathParts(left.path).extension;
      const rightExtension = getArchivePathParts(right.path).extension;
      return (SHAPEFILE_COMPONENT_ORDER.get(leftExtension) ?? Number.MAX_SAFE_INTEGER) -
        (SHAPEFILE_COMPONENT_ORDER.get(rightExtension) ?? Number.MAX_SAFE_INTEGER);
    });
};

/**
 * shpjs accepts an ArrayBuffer ZIP for a complete Shapefile dataset. Archive
 * previews normally extract one entry at a time, so rebuild a small STORE-only
 * ZIP from the selected .shp and its sidecars before delegating to the existing
 * geospatial renderer. STORE avoids wasting CPU recompressing already
 * compressed archive data.
 */
export const createShapefileBundleArchive = async (
  entries: readonly ArchiveEntryView[],
  readEntry: (entry: ArchiveEntryView) => Promise<ArrayBuffer>
) => {
  const JSZip = resolveJSZipWriter(await import('jszip'));
  const zip = new JSZip();

  for (const entry of entries) {
    const { filename } = getArchivePathParts(entry.path);
    zip.file(filename || entry.name, await readEntry(entry));
  }

  return zip.generateAsync({
    type: 'arraybuffer',
    compression: 'STORE',
  });
};

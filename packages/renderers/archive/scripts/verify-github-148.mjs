import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  createShapefileBundleArchive,
  getShapefileBundleEntries,
} from '../dist/shapefileBundle.js';

const encoder = new TextEncoder();
const entry = (path, content) => {
  const filename = path.split('/').pop();
  const extension = filename.split('.').pop().toLowerCase();
  const buffer = encoder.encode(content).buffer;
  return {
    id: path,
    path,
    name: filename,
    extension,
    size: buffer.byteLength,
    depth: path.split('/').length - 1,
    previewable: extension === 'shp',
    compressedFile: {
      name: filename,
      size: buffer.byteLength,
      async extract() {
        return new File([buffer], filename);
      },
    },
    buffer,
  };
};

const selected = entry('maps/Vegetation.SHP', 'shape');
const dbf = entry('maps/vegetation.dbf', 'attributes');
const projection = entry('maps/VEGETATION.prj', 'projection');
const encoding = entry('maps/vegetation.CPG', 'UTF-8');
const index = entry('maps/vegetation.shx', 'index');
const metadata = entry('maps/vegetation.shp.xml', 'metadata');
const otherDirectory = entry('backup/vegetation.dbf', 'wrong directory');
const otherDataset = entry('maps/roads.dbf', 'wrong dataset');
const entries = [
  otherDataset,
  projection,
  metadata,
  selected,
  otherDirectory,
  index,
  dbf,
  encoding,
];

const bundleEntries = getShapefileBundleEntries(entries, selected);
assert.deepEqual(
  bundleEntries.map(item => item.path),
  [
    'maps/Vegetation.SHP',
    'maps/vegetation.dbf',
    'maps/vegetation.shx',
    'maps/VEGETATION.prj',
    'maps/vegetation.CPG',
  ]
);
assert.deepEqual(getShapefileBundleEntries(entries, metadata), []);

const bundle = await createShapefileBundleArchive(
  bundleEntries,
  async item => item.buffer
);
const zip = await JSZip.loadAsync(bundle);
assert.deepEqual(
  Object.keys(zip.files),
  [
    'Vegetation.SHP',
    'vegetation.dbf',
    'vegetation.shx',
    'VEGETATION.prj',
    'vegetation.CPG',
  ]
);
assert.equal(await zip.file('vegetation.dbf').async('string'), 'attributes');
assert.equal(await zip.file('VEGETATION.prj').async('string'), 'projection');

console.log('Issue #148 Shapefile archive bundling verified.');

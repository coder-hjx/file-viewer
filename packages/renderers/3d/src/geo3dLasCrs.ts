import type { Geo3dRangeGetter } from './geo3dInspect.js'

export interface LasCrsInspection {
  crs?: string
  hasCrsMetadata: boolean
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes).replace(/\0/g, '').trim()
const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

/** Inline GeoTIFF CRS codes only. Citation text is not an authoritative EPSG ID. */
export function parseLasGeoKeys(bytes: Uint8Array): string | undefined {
  const data = view(bytes)
  if (bytes.length < 8 || bytes.length % 2 || data.getUint16(0, true) !== 1
    || data.getUint16(2, true) !== 1 || data.getUint16(4, true) > 1)
    throw new Error('Invalid LAS GeoKeyDirectory header.')
  const count = data.getUint16(6, true)
  if (8 + count * 8 > bytes.length) throw new Error('Truncated LAS GeoKeyDirectory.')
  const keys = new Map<number, number>()
  for (let i = 0; i < count; i++) {
    const offset = 8 + i * 8
    const key = data.getUint16(offset, true)
    if (![1024, 2048, 3072].includes(key)) continue
    if (data.getUint16(offset + 2, true) !== 0 || data.getUint16(offset + 4, true) !== 1)
      throw new Error('Unsupported LAS GeoKey CRS value encoding.')
    const value = data.getUint16(offset + 6, true)
    if (keys.has(key) && keys.get(key) !== value) throw new Error('Conflicting LAS GeoKey CRS values.')
    keys.set(key, value)
  }
  const model = keys.get(1024)
  // A projected model's geographic base CRS does not describe its XY units.
  const code = model === 1 || keys.has(3072) ? keys.get(3072)
    : model === undefined || model === 2 || model === 3 ? keys.get(2048) : undefined
  return code && code < 32767 ? `EPSG:${code}` : undefined
}

/** Read only bounded LAS VLR metadata; never decode points or fetch a CRS registry. */
export async function inspectLasCrsRangeSource(getter: Geo3dRangeGetter): Promise<LasCrsInspection> {
  let budget = 4 * 1024 * 1024
  const exact = async (begin: number, end: number) => {
    budget -= end - begin
    if (budget < 0) throw new Error('LAS CRS metadata exceeds the inspection budget.')
    const bytes = await getter(begin, end)
    if (bytes.byteLength !== end - begin) throw new Error('Truncated LAS CRS metadata.')
    return bytes
  }
  const header = await exact(0, 227)
  if (text(header.subarray(0, 4)) !== 'LASF' || header[24] !== 1 || header[25]! > 4)
    throw new Error('Invalid LAS header while reading CRS metadata.')
  const data = view(header)
  let offset = data.getUint16(94, true)
  const end = data.getUint32(96, true)
  const count = data.getUint32(100, true)
  if (offset < 227 || end < offset || count > 4096) throw new Error('Invalid LAS VLR metadata bounds.')
  let crs: string | undefined
  let hasCrsMetadata = false
  for (let i = 0; i < count; i++) {
    if (offset + 54 > end) throw new Error('LAS VLR header exceeds the point-data offset.')
    const vlr = await exact(offset, offset + 54)
    const fields = view(vlr)
    const length = fields.getUint16(20, true)
    const next = offset + 54 + length
    if (next > end) throw new Error('LAS VLR payload exceeds the point-data offset.')
    const id = fields.getUint16(18, true)
    if (text(vlr.subarray(2, 18)) === 'LASF_Projection' && [2112, 34735, 34736, 34737].includes(id) && length) {
      const payload = await exact(offset + 54, next)
      hasCrsMetadata ||= id === 34735 || id === 34736 || !!text(payload)
      if (id === 34735) {
        const candidate = parseLasGeoKeys(payload)
        if (crs && candidate && crs !== candidate) throw new Error('Conflicting LAS GeoKey CRS directories.')
        crs = candidate ?? crs
      }
    }
    offset = next
  }
  return { crs, hasCrsMetadata }
}

type BinaryInput = ArrayBuffer | Uint8Array | ArrayBufferView;

type ReaderMethod = ((offset: number) => number) & { byteWidth?: number };

/**
 * Lightweight little-endian binary reader for EMF/WMF metafile parsing.
 */
export class BinaryReader {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly length: number;

  constructor(input: BinaryInput) {
    if (input instanceof Uint8Array) {
      this.bytes = input;
    } else if (input instanceof ArrayBuffer) {
      this.bytes = new Uint8Array(input);
    } else if (ArrayBuffer.isView(input)) {
      this.bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else {
      throw new TypeError('BinaryReader expects ArrayBuffer or Uint8Array');
    }
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.length = this.bytes.byteLength;
  }

  ensure(offset: number, size = 1): boolean {
    return offset >= 0 && offset + size <= this.length;
  }

  u8(offset: number): number { return this.ensure(offset, 1) ? this.view.getUint8(offset) : 0; }
  i8(offset: number): number { return this.ensure(offset, 1) ? this.view.getInt8(offset) : 0; }
  u16(offset: number): number { return this.ensure(offset, 2) ? this.view.getUint16(offset, true) : 0; }
  i16(offset: number): number { return this.ensure(offset, 2) ? this.view.getInt16(offset, true) : 0; }
  u32(offset: number): number { return this.ensure(offset, 4) ? this.view.getUint32(offset, true) : 0; }
  i32(offset: number): number { return this.ensure(offset, 4) ? this.view.getInt32(offset, true) : 0; }

  slice(offset: number, length: number): Uint8Array {
    if (!this.ensure(offset, length)) {
      return new Uint8Array(0);
    }
    return this.bytes.subarray(offset, offset + length);
  }

  array(offset: number, count: number, readFn: ReaderMethod): number[] {
    const out: number[] = [];
    const width = readFn.byteWidth ?? 1;
    for (let i = 0; i < count; i += 1) {
      out.push(readFn.call(this, offset + i * width));
    }
    return out;
  }
}

BinaryReader.prototype.u8.byteWidth = 1;
BinaryReader.prototype.i8.byteWidth = 1;
BinaryReader.prototype.u16.byteWidth = 2;
BinaryReader.prototype.i16.byteWidth = 2;
BinaryReader.prototype.u32.byteWidth = 4;
BinaryReader.prototype.i32.byteWidth = 4;

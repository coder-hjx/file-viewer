type BinaryInput = ArrayBuffer | Uint8Array | ArrayBufferView;

const globalBuffer = (globalThis as { Buffer?: { from(input: Uint8Array): { toString(encoding: string): string } } }).Buffer;

export function escapeHtml(text: unknown): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asUint8Array(input: BinaryInput): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

export function bytesToBase64(bytes: BinaryInput): string {
  const view = asUint8Array(bytes);
  if (globalBuffer) {
    return globalBuffer.from(view).toString('base64');
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, Math.min(i + chunk, view.length)));
  }
  return btoa(binary);
}

export function dataUrlFromBytes(bytes: BinaryInput, mime = 'application/octet-stream'): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

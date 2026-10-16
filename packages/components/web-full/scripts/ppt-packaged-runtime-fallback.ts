/**
 * Build-only fallback for static bundlers. Packaged Demo/CDN distributions
 * always provide presentation.pptModuleUrl, which loads the authoritative
 * vendor/ppt runtime tree. Keeping this branch tiny prevents Vite from also
 * emitting hashed copies of the 1.5 MiB WASM and 16 MiB CJK font.
 */
export const createPptViewer = async (): Promise<never> => {
  throw new Error('Packaged PPT runtime URL was not initialized.');
};

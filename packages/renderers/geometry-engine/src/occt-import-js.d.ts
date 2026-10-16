declare module 'occt-import-js' {
  interface OcctModuleOptions {
    locateFile?: (path: string, scriptDirectory: string) => string;
  }

  interface OcctImportModule {
    ReadStepFile(content: Uint8Array, params: unknown): unknown;
    ReadIgesFile(content: Uint8Array, params: unknown): unknown;
    ReadBrepFile(content: Uint8Array, params: unknown): unknown;
  }

  const createOcctImportModule: (options?: OcctModuleOptions) => Promise<OcctImportModule>;
  export default createOcctImportModule;
}

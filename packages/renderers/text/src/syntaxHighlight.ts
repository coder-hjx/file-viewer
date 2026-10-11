import type { HLJSApi, LanguageFn } from 'highlight.js'

const languageMap: Record<string, string> = {
  xhtml: 'xml',
  rss: 'xml',
  atom: 'xml',
  xjb: 'xml',
  xsd: 'xml',
  xsl: 'xml',
  plist: 'xml',
  wsf: 'xml',
  svg: 'xml',
  zsh: 'bash',
  'c++': 'cpp',
  'h++': 'cpp',
  hh: 'cpp',
  hxx: 'cpp',
  cxx: 'cpp',
  'c#': 'csharp',
  mkdown: 'markdown',
  mkd: 'markdown',
  gemspec: 'ruby',
  podspec: 'ruby',
  thor: 'ruby',
  irb: 'ruby',
  golang: 'go',
  jsp: 'java',
  kts: 'kotlin',
  ktm: 'kotlin',
  ktx: 'kotlin',
  pluto: 'lua',
  mk: 'makefile',
  mak: 'makefile',
  make: 'makefile',
  pl: 'perl',
  pm: 'perl',
  mm: 'objectivec',
  objc: 'objectivec',
  'obj-c': 'objectivec',
  'obj-c++': 'objectivec',
  'objective-c++': 'objectivec',
  text: 'plaintext',
  gyp: 'python',
  ipython: 'python',
  pycon: 'python-repl',
  console: 'shell',
  shellsession: 'shell',
  mts: 'typescript',
  cts: 'typescript',
  vb: 'vbnet',
  bash: 'bash',
  c: 'c',
  cc: 'cpp',
  cjs: 'javascript',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  diff: 'diff',
  patch: 'diff',
  bundle: 'plaintext',
  bdl: 'plaintext',
  gv: 'plaintext',
  go: 'go',
  graphql: 'graphql',
  gql: 'graphql',
  h: 'c',
  hcl: 'plaintext',
  hpp: 'cpp',
  html: 'xml',
  htm: 'xml',
  http: 'http',
  ini: 'ini',
  ipynb: 'json',
  java: 'java',
  js: 'javascript',
  json: 'json',
  json5: 'json',
  jsonc: 'json',
  jsx: 'javascript',
  kt: 'kotlin',
  log: 'plaintext',
  md: 'markdown',
  markdown: 'markdown',
  mjs: 'javascript',
  php: 'php',
  proto: 'protobuf',
  py: 'python',
  rb: 'ruby',
  react: 'javascript',
  rs: 'rust',
  sh: 'bash',
  sql: 'sql',
  swift: 'swift',
  tex: 'latex',
  toml: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  txt: 'plaintext',
  vue: 'xml',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml'
}

const languageLoaders: Record<string, () => Promise<{ default: LanguageFn }>> = {
  c: () => import('highlight.js/lib/languages/c'),
  less: () => import('highlight.js/lib/languages/less'),
  lua: () => import('highlight.js/lib/languages/lua'),
  makefile: () => import('highlight.js/lib/languages/makefile'),
  perl: () => import('highlight.js/lib/languages/perl'),
  objectivec: () => import('highlight.js/lib/languages/objectivec'),
  'php-template': () => import('highlight.js/lib/languages/php-template'),
  'python-repl': () => import('highlight.js/lib/languages/python-repl'),
  r: () => import('highlight.js/lib/languages/r'),
  scss: () => import('highlight.js/lib/languages/scss'),
  shell: () => import('highlight.js/lib/languages/shell'),
  vbnet: () => import('highlight.js/lib/languages/vbnet'),
  wasm: () => import('highlight.js/lib/languages/wasm'),
  bash: () => import('highlight.js/lib/languages/bash'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  css: () => import('highlight.js/lib/languages/css'),
  diff: () => import('highlight.js/lib/languages/diff'),
  go: () => import('highlight.js/lib/languages/go'),
  graphql: () => import('highlight.js/lib/languages/graphql'),
  http: () => import('highlight.js/lib/languages/http'),
  ini: () => import('highlight.js/lib/languages/ini'),
  java: () => import('highlight.js/lib/languages/java'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  json: () => import('highlight.js/lib/languages/json'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  latex: () => import('highlight.js/lib/languages/latex'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  php: () => import('highlight.js/lib/languages/php'),
  protobuf: () => import('highlight.js/lib/languages/protobuf'),
  python: () => import('highlight.js/lib/languages/python'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  rust: () => import('highlight.js/lib/languages/rust'),
  sql: () => import('highlight.js/lib/languages/sql'),
  swift: () => import('highlight.js/lib/languages/swift'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  xml: () => import('highlight.js/lib/languages/xml'),
  yaml: () => import('highlight.js/lib/languages/yaml')
}

let highlighterPromise: Promise<HLJSApi> | null = null
const registeredLanguages = new Set<string>()

export const resolveLanguage = (type: string) => {
  const normalized = type.trim().toLowerCase()
  return languageMap[normalized] || (languageLoaders[normalized] ? normalized : 'plaintext')
}

export const escapeHtml = (value: string) => {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[char]
  })
}

export const loadHighlighter = async () => {
  if (!highlighterPromise) {
    highlighterPromise = import('highlight.js/lib/core').then((module) => module.default)
  }
  return highlighterPromise
}

export const registerLanguageOnce = async (hljs: HLJSApi, name: string) => {
  if (registeredLanguages.has(name)) {
    return true
  }
  const loader = languageLoaders[name]
  if (!loader) {
    return false
  }
  const { default: language } = await loader()
  hljs.registerLanguage(name, language)
  registeredLanguages.add(name)
  return true
}

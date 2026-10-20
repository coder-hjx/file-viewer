import type { DemoLocale } from '@/composables/useDemoCopy'

/**
 * First-visit welcome state. Browsers and automation follow the same rules.
 * Deep links and embeds are handled by the page controller.
 */
export const DEMO_WELCOME_STORAGE_KEY = 'file-viewer-demo:welcome-dismissed'

export function shouldShowDemoWelcome(search = typeof window === 'undefined' ? '' : window.location.search) {
  if (typeof window === 'undefined') return false
  const forced = new URLSearchParams(search).get('welcome')
  if (forced === '1') return true
  if (forced === '0') return false
  try {
    return window.localStorage.getItem(DEMO_WELCOME_STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

export function dismissDemoWelcome() {
  try {
    window.localStorage.setItem(DEMO_WELCOME_STORAGE_KEY, '1')
  } catch {
    // Private mode / disabled storage: the card simply returns next visit.
  }
}

export interface DemoWelcomeCopy {
  eyebrow: string
  title: string
  description: string
  chooseFile: string
  browseSamples: string
  drop: string
  privacy: string
  featured: string
  close: string
}

export const demoWelcomeCopy: Record<DemoLocale, DemoWelcomeCopy> = {
  'zh-CN': {
    eyebrow: 'File Viewer 在线演示',
    title: '从一个文件开始',
    description: '选择本地文件或体验内置示例，直接在浏览器中预览。',
    chooseFile: '选择本地文件',
    browseSamples: '浏览全部示例',
    drop: '或把文件拖到这里',
    privacy: '本地文件不会上传到任何服务器。',
    featured: '试试这些示例',
    close: '关闭欢迎卡片'
  },
  'en-US': {
    eyebrow: 'File Viewer live demo',
    title: 'Open a file to get started',
    description: 'Choose a local file or explore a sample. Everything renders in your browser.',
    chooseFile: 'Choose a local file',
    browseSamples: 'Browse all samples',
    drop: 'or drop a file here',
    privacy: 'Local files are never uploaded.',
    featured: 'Try a sample',
    close: 'Close welcome card'
  },
  'ja-JP': {
    eyebrow: 'File Viewer ライブデモ',
    title: 'ファイルから始めましょう',
    description: 'ローカルファイルやサンプルを、ブラウザでそのままプレビュー。',
    chooseFile: 'ローカルファイルを選択',
    browseSamples: 'すべてのサンプルを見る',
    drop: 'またはここにファイルをドロップ',
    privacy: 'ローカルファイルはアップロードされません。',
    featured: 'サンプルを試す',
    close: 'ウェルカムカードを閉じる'
  },
  'de-DE': {
    eyebrow: 'File Viewer Live-Demo',
    title: 'Mit einer Datei loslegen',
    description: 'Lokale Datei öffnen oder ein Beispiel ausprobieren. Die Vorschau läuft im Browser.',
    chooseFile: 'Lokale Datei wählen',
    browseSamples: 'Alle Beispiele ansehen',
    drop: 'oder Datei hier ablegen',
    privacy: 'Lokale Dateien werden nie hochgeladen.',
    featured: 'Beispiel ausprobieren',
    close: 'Willkommenskarte schließen'
  }
}

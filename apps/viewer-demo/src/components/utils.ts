import { parse } from 'qs'
import { parseFileViewerOptions } from '@file-viewer/core'
import type { FileViewerOptions } from '@file-viewer/core'

type ListenCallback = (file?: File, url?: string, options?: FileViewerOptions) => void;

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return firstString(value[0])
  }
  return undefined
}

const normalizeOrigin = (value?: string): string | undefined => {
  if (!value) {
    return undefined
  }
  try {
    return new URL(value).origin
  } catch {
    return value
  }
}

export function createDemoFileHandoff() {
  const params = parse(location.search.substring(1)) as Record<string, unknown>
  const url = firstString(params.url)
  const from = normalizeOrigin(firstString(params.from))
  const name = firstString(params.name)
  const mode = firstString(params.mode)
  const embed = firstString(params.embed)
  const options = params.options
  const viewerOptions = parseFileViewerOptions(options) as FileViewerOptions | undefined

  const isIframeEntry = window.location.pathname.endsWith('/iframe.html') || window.location.pathname.endsWith('/iframe')
  const isPostMessageRequest = Boolean(from && name)
  const isEmbedRequest = isIframeEntry || embed === '1' || mode === 'iframe' || isPostMessageRequest
  const isExplicitUrlRequest = Boolean(url)
  const isImmersiveRequest = isEmbedRequest || isExplicitUrlRequest

  return {
    initialUrl: url,
    isExplicitUrlRequest,
    isImmersiveRequest,
    isEmbedRequest,
    isIframeEntry,
    isPostMessageRequest,
    listen(callback: ListenCallback) {
      if (url) {
        callback(undefined, url, viewerOptions)
        return () => {}
      }
      if (!from || !name) {
        return () => {}
      }

      callback(undefined, undefined, viewerOptions)
      const handleMessage = (event: MessageEvent) => {
        const { origin, data: blob } = event
        if (origin === from && blob instanceof Blob) {
          // 构造响应，自动渲染
          const value = new File([blob], name, {})
          callback(value, undefined, viewerOptions)
        }
      }
      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }
  }
}

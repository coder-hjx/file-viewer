import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

type ScrollerGetter = () => HTMLElement | null

const getScrollableRange = (element: HTMLElement, axis: 'x' | 'y') => {
  return axis === 'y'
    ? Math.max(0, element.scrollHeight - element.clientHeight)
    : Math.max(0, element.scrollWidth - element.clientWidth)
}

export const getScrollOffset = (element: HTMLElement, axis: 'x' | 'y') => {
  return axis === 'y' ? element.scrollTop : element.scrollLeft
}

export const applyScrollOffset = (element: HTMLElement, axis: 'x' | 'y', offset: number) => {
  const range = getScrollableRange(element, axis)
  const value = Math.max(0, Math.min(range, offset))
  if (axis === 'y') {
    element.scrollTop = value
  } else {
    element.scrollLeft = value
  }
}

export const useSynchronizedScroll = (
  enabled: Ref<boolean>,
  getLeftScroller: ScrollerGetter,
  getRightScroller: ScrollerGetter
) => {
  let cleanup: (() => void) | null = null
  let source: HTMLElement | null = null
  let frame = 0

  const destroy = () => {
    cleanup?.()
    cleanup = null
    source = null
    if (frame) {
      window.cancelAnimationFrame(frame)
      frame = 0
    }
  }

  const mirror = (from: HTMLElement, to: HTMLElement) => {
    if (source && source !== from) {
      return
    }
    source = from
    if (frame) {
      window.cancelAnimationFrame(frame)
    }
    frame = window.requestAnimationFrame(() => {
      applyScrollOffset(to, 'y', getScrollOffset(from, 'y'))
      applyScrollOffset(to, 'x', getScrollOffset(from, 'x'))
      window.requestAnimationFrame(() => {
        source = null
      })
    })
  }

  const bind = async () => {
    destroy()
    if (!enabled.value) {
      return
    }

    await nextTick()
    const left = getLeftScroller()
    const right = getRightScroller()
    if (!left || !right || left === right) {
      return
    }

    const onLeftScroll = () => mirror(left, right)
    const onRightScroll = () => mirror(right, left)
    left.addEventListener('scroll', onLeftScroll, { passive: true })
    right.addEventListener('scroll', onRightScroll, { passive: true })

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
        if (!source) {
          mirror(left, right)
        }
      })
      : null
    resizeObserver?.observe(left)
    resizeObserver?.observe(right)

    cleanup = () => {
      left.removeEventListener('scroll', onLeftScroll)
      right.removeEventListener('scroll', onRightScroll)
      resizeObserver?.disconnect()
    }
  }

  watch(enabled, () => {
    void bind()
  })

  onBeforeUnmount(destroy)

  return {
    bind,
    destroy
  }
}

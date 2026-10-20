// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import DemoWelcomeCard from '../apps/viewer-demo/src/components/demo/DemoWelcomeCard.vue'
import { demoWelcomeCopy, dismissDemoWelcome, shouldShowDemoWelcome } from '../apps/viewer-demo/src/composables/useDemoWelcome'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('first-visit welcome', () => {
  it('uses the same first-visit and dismissal behavior in automated browsers', () => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, value: true })
    expect(shouldShowDemoWelcome('')).toBe(true)
    dismissDemoWelcome()
    expect(shouldShowDemoWelcome('')).toBe(false)
    expect(shouldShowDemoWelcome('?welcome=1')).toBe(true)
    expect(shouldShowDemoWelcome('?welcome=0')).toBe(false)
  })

  it('remains usable when persistent storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
    expect(shouldShowDemoWelcome('')).toBe(true)
    expect(() => dismissDemoWelcome()).not.toThrow()
  })

  it('provides complete, nonempty welcome copy in all four supported locales', () => {
    const keys = Object.keys(demoWelcomeCopy['en-US']).sort()
    for (const copy of Object.values(demoWelcomeCopy)) {
      expect(Object.keys(copy).sort()).toEqual(keys)
      expect(Object.values(copy).every(text => text.trim())).toBe(true)
    }
  })

  it('focuses the nonmodal card and restores focus after Escape', async () => {
    const previous = document.createElement('button')
    const host = document.createElement('div')
    document.body.append(previous, host)
    previous.focus()
    const open = ref(true)
    const app = createApp({ render: () => open.value ? h(DemoWelcomeCard, {
      copy: demoWelcomeCopy['en-US'], samples: [], onClose: () => { open.value = false }
    }) : null })
    try {
      app.mount(host)
      await nextTick()
      const dialog = host.querySelector<HTMLElement>('[role=dialog]')!
      expect(dialog.getAttribute('aria-modal')).toBe('false')
      expect(document.activeElement).toBe(dialog)
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()
      expect(host.querySelector('[role=dialog]')).toBeNull()
      expect(document.activeElement).toBe(previous)
    } finally { app.unmount(); host.remove(); previous.remove() }
  })
})

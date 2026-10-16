import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'

export type DemoSourcePanelMode = 'link' | 'upload' | 'samples'
export type DemoSourcePanelAnchor = 'link' | 'upload' | 'samples' | 'file'

export type UseDemoFloatingPanelsOptions = {
  linkTrigger: Ref<HTMLElement | null>
  uploadTrigger: Ref<HTMLElement | null>
  samplesTrigger: Ref<HTMLElement | null>
  fileTrigger: Ref<HTMLElement | null>
  mobileBreakpoint?: number
}

const DESKTOP_PANEL_WIDTH: Record<DemoSourcePanelMode, number> = {
  link: 430,
  upload: 390,
  samples: 690
}

/**
 * Owns desktop source-popover anchoring without owning the panel content.
 *
 * Mobile deliberately returns an empty style object: the page/CSS turns the
 * same content into a bottom sheet, avoiding duplicate responsive state.
 */
export function useDemoFloatingPanels(options: UseDemoFloatingPanelsOptions) {
  const sourcePanelOpen = ref(false)
  const sourcePanelMode = ref<DemoSourcePanelMode>('link')
  const sourcePanelAnchor = ref<DemoSourcePanelAnchor>('link')
  const sourcePanelStyle = ref<Record<string, string>>({})

  const triggerFor = (anchor: DemoSourcePanelAnchor) => {
    if (anchor === 'upload') return options.uploadTrigger.value
    if (anchor === 'samples') return options.samplesTrigger.value
    if (anchor === 'file') return options.fileTrigger.value
    return options.linkTrigger.value
  }

  async function updatePosition() {
    const breakpoint = options.mobileBreakpoint ?? 720
    if (window.innerWidth <= breakpoint) {
      sourcePanelStyle.value = {}
      return
    }

    await nextTick()
    const trigger = triggerFor(sourcePanelAnchor.value)
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const margin = 18
    const gap = 12
    const desiredWidth = Math.min(
      DESKTOP_PANEL_WIDTH[sourcePanelMode.value],
      window.innerWidth - margin * 2
    )
    // Center on the invoking control, then clamp to viewport gutters. The file
    // capsule can open the same sample panel from a different anchor.
    const centeredLeft = rect.left + rect.width / 2 - desiredWidth / 2
    const left = Math.max(margin, Math.min(centeredLeft, window.innerWidth - desiredWidth - margin))
    const preferredTop = rect.bottom + gap
    // A short viewport may not fit the panel below its trigger. Move it upward
    // while retaining a usable minimum body height and internal scrolling.
    const minimumPanelHeight = Math.min(260, window.innerHeight - margin * 2)
    const top = Math.max(
      margin,
      Math.min(preferredTop, window.innerHeight - minimumPanelHeight - margin)
    )

    sourcePanelStyle.value = {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(desiredWidth)}px`,
      maxHeight: `${Math.max(180, Math.round(window.innerHeight - top - margin))}px`
    }
  }

  async function openSourcePanel(
    mode: DemoSourcePanelMode,
    anchor: DemoSourcePanelAnchor = mode
  ) {
    sourcePanelMode.value = mode
    sourcePanelAnchor.value = anchor
    sourcePanelOpen.value = true
    await updatePosition()
  }

  function closeSourcePanel() {
    sourcePanelOpen.value = false
  }

  async function toggleSourcePanel(
    mode: DemoSourcePanelMode,
    anchor: DemoSourcePanelAnchor = mode
  ) {
    // Mode and anchor both participate in identity: Samples from the top nav
    // and Samples from the filename capsule are distinct placements.
    if (
      sourcePanelOpen.value &&
      sourcePanelMode.value === mode &&
      sourcePanelAnchor.value === anchor
    ) {
      closeSourcePanel()
      return false
    }
    await openSourcePanel(mode, anchor)
    return true
  }

  return {
    sourcePanelOpen,
    sourcePanelMode,
    sourcePanelAnchor,
    sourcePanelStyle,
    openSourcePanel,
    closeSourcePanel,
    toggleSourcePanel,
    updatePosition
  }
}

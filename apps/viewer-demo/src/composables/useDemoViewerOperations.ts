import { computed, nextTick, ref, type Ref } from 'vue'
import type { DemoCopy } from '@/composables/useDemoCopy'
import type { DemoViewerSettings } from '@/composables/useDemoViewerSettings'
import type {
  FileViewerFitMode,
  FileViewerOperationAvailability,
  FileViewerPublicApi,
  FileViewerSearchState,
  FileViewerViewState,
  FileViewerViewStateChange,
  FileViewerZoomState
} from '@file-viewer/core'

export type DemoViewerAction =
  | 'download'
  | 'print'
  | 'exportHtml'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'

export type UseDemoViewerOperationsOptions = {
  fileViewerRef: Ref<FileViewerPublicApi | null>
  settings: Ref<DemoViewerSettings>
  fitMode: Ref<FileViewerFitMode | 'default'>
  copy: Readonly<Ref<DemoCopy>>
  previewType: Readonly<Ref<string>>
  hasActivePreview: () => boolean
  isMobileViewport: () => boolean
  beforeOpenSearch: () => void
  closeActionPanels: () => void
  hideRecentPanel: () => void
}

const emptyAvailability = (): FileViewerOperationAvailability => ({
  download: false,
  print: false,
  exportHtml: false,
  zoom: false,
  zoomIn: false,
  zoomOut: false,
  zoomReset: false
})

const emptyZoomState = (): FileViewerZoomState => ({
  scale: 1,
  label: '100%',
  canZoomIn: false,
  canZoomOut: false,
  canReset: false
})

const emptySearchState = (): FileViewerSearchState => ({
  query: '',
  total: 0,
  currentIndex: -1,
  current: null,
  matches: []
})

/**
 * Adapter between the product shell and File Viewer's public imperative API.
 *
 * This composable owns search, zoom, fit, print and operation availability.
 * Panel placement and file selection stay in the page controller, so renderer
 * operations can be tested without recreating the entire demo shell.
 */
export function useDemoViewerOperations(options: UseDemoViewerOperationsOptions) {
  // These refs form the renderer-independent toolbar state. Renderer events
  // update them; the page only binds them to desktop/mobile controls.
  const viewerSearchOpen = ref(false)
  const viewerSearchQuery = ref('')
  const viewerSearchInputRef = ref<HTMLInputElement | null>(null)
  const viewerSearchState = ref<FileViewerSearchState>(emptySearchState())
  const viewerAvailability = ref<FileViewerOperationAvailability>(emptyAvailability())
  const viewerZoomState = ref<FileViewerZoomState>(emptyZoomState())
  const viewerViewState = ref<FileViewerViewState>({})

  // Providers can change while an async fit/zoom promise is pending. The epoch
  // prevents a late result from the previous file overwriting the new state.
  let providerEpoch = 0

  const viewerActionDisabled = computed(() => !options.hasActivePreview())
  const viewerZoomDisplayLabel = computed(() => (
    !viewerActionDisabled.value && viewerAvailability.value.zoom
      ? viewerZoomState.value.label
      : '—'
  ))
  const viewerZoomResetLabel = computed(() => (
    `${options.copy.value.resetZoom}: ${viewerZoomDisplayLabel.value}`
  ))
  const viewerSearchSummary = computed(() => {
    if (!viewerSearchQuery.value.trim()) return '0/0'
    const state = viewerSearchState.value
    return state.total ? `${state.currentIndex + 1}/${state.total}` : '0/0'
  })
  const viewerPageLabel = computed(() => {
    // Page-aware renderers report page/pageCount. Other formats fall back to a
    // stable format label instead of showing a misleading 1 / 1.
    const pageCount = viewerViewState.value.pageCount
    return pageCount && pageCount > 0
      ? `${viewerViewState.value.page || 1} / ${pageCount}`
      : options.previewType.value
  })

  const syncZoomAndAvailability = () => {
    // Read both snapshots from the same active provider after an operation so
    // disabled states cannot lag behind the displayed zoom label.
    const viewer = options.fileViewerRef.value
    if (!viewer) return
    viewerZoomState.value = viewer.getZoomState()
    viewerAvailability.value = viewer.getOperationAvailability()
  }

  async function fitCurrentDocument() {
    // `default` means “ask the renderer for its preferred automatic fit” when
    // the user presses Fit; explicit settings use their selected mode.
    options.closeActionPanels()
    const requestEpoch = providerEpoch
    const settings = options.settings.value
    const mode = options.fitMode.value === 'default' ? 'auto' : options.fitMode.value
    const result = await options.fileViewerRef.value?.fitToView({
      mode,
      resize: settings.fitResize,
      padding: settings.fitPadding,
      minScale: settings.fitMinScale,
      maxScale: settings.fitMaxScale
    })
    if (requestEpoch === providerEpoch && result?.applied) {
      syncZoomAndAvailability()
    }
  }

  async function printDirect() {
    options.closeActionPanels()
    await options.fileViewerRef.value?.printRenderedHtml()
  }

  async function printWithMask() {
    options.closeActionPanels()
    await options.fileViewerRef.value?.printWithMask()
  }

  function triggerViewerAction(action: DemoViewerAction) {
    // Download/print/export are fire-and-forget public actions. Zoom returns a
    // state snapshot that is applied only if the provider is still current.
    options.closeActionPanels()
    if (action === 'download') {
      void options.fileViewerRef.value?.downloadOriginalFile()
      return
    }
    if (action === 'print') {
      void printDirect()
      return
    }
    if (action === 'exportHtml') {
      void options.fileViewerRef.value?.exportRenderedHtml()
      return
    }

    const requestEpoch = providerEpoch
    const nextAction = action === 'zoomIn'
      ? options.fileViewerRef.value?.zoomIn()
      : action === 'zoomOut'
        ? options.fileViewerRef.value?.zoomOut()
        : options.fileViewerRef.value?.resetZoom()
    void nextAction?.then(state => {
      if (requestEpoch !== providerEpoch) return
      viewerZoomState.value = state
      viewerAvailability.value = options.fileViewerRef.value?.getOperationAvailability()
        || viewerAvailability.value
    })
  }

  async function selectFitMode(event: Event) {
    // Persist the selection in applied settings first so a later renderer
    // remount receives the same fit contract as this immediate operation.
    const value = (event.target as HTMLSelectElement).value as FileViewerFitMode | 'default'
    options.fitMode.value = value
    options.settings.value = { ...options.settings.value, fitMode: value }
    if (value === 'default') return

    await nextTick()
    const requestEpoch = providerEpoch
    const settings = options.settings.value
    const result = await options.fileViewerRef.value?.fitToView({
      mode: value,
      resize: settings.fitResize,
      padding: settings.fitPadding
    })
    if (requestEpoch === providerEpoch && result?.applied) {
      syncZoomAndAvailability()
    }
  }

  async function runViewerSearch() {
    // Empty input maps to the public clear operation, ensuring highlights and
    // match navigation are reset together.
    const query = viewerSearchQuery.value.trim()
    viewerSearchState.value = query
      ? await options.fileViewerRef.value?.searchDocument(query) || viewerSearchState.value
      : await options.fileViewerRef.value?.clearDocumentSearch() || viewerSearchState.value
  }

  async function openViewerSearch() {
    // The page callback closes competing overlays before focus enters search.
    // On mobile it also hides recent history to protect the content viewport.
    if (!options.settings.value.searchEnabled) return
    options.beforeOpenSearch()
    if (options.isMobileViewport()) options.hideRecentPanel()
    viewerSearchOpen.value = true
    await nextTick()
    viewerSearchInputRef.value?.focus()
    viewerSearchInputRef.value?.select()
  }

  async function closeViewerSearch() {
    viewerSearchOpen.value = false
    viewerSearchState.value = await options.fileViewerRef.value?.clearDocumentSearch()
      || viewerSearchState.value
  }

  function resetViewerSearch() {
    viewerSearchQuery.value = ''
    void closeViewerSearch()
  }

  async function nextViewerSearch() {
    // Entering a new query and immediately navigating runs the search first;
    // navigation only occurs once state belongs to the current query.
    const query = viewerSearchQuery.value.trim()
    if (!query) return
    if (viewerSearchState.value.query !== query) {
      await runViewerSearch()
      return
    }
    viewerSearchState.value = await options.fileViewerRef.value?.nextSearchResult()
      || viewerSearchState.value
  }

  async function previousViewerSearch() {
    const query = viewerSearchQuery.value.trim()
    if (!query) return
    if (viewerSearchState.value.query !== query) {
      await runViewerSearch()
      return
    }
    viewerSearchState.value = await options.fileViewerRef.value?.previousSearchResult()
      || viewerSearchState.value
  }

  function handleViewerAvailabilityChange(availability: FileViewerOperationAvailability) {
    viewerAvailability.value = availability
    viewerZoomState.value = options.fileViewerRef.value?.getZoomState() || viewerZoomState.value
  }

  function handleViewerLoadStart() {
    // Clear all provider-derived UI before a new renderer becomes ready. This
    // prevents controls for the previous format remaining briefly enabled.
    providerEpoch += 1
    viewerAvailability.value = emptyAvailability()
    viewerZoomState.value = emptyZoomState()
    viewerViewState.value = {}
  }

  const handleViewerSearchChange = (state: FileViewerSearchState) => {
    viewerSearchState.value = state
  }
  const handleViewerZoomChange = (state: FileViewerZoomState) => {
    viewerZoomState.value = state
  }
  const handleViewerViewStateChange = (change: FileViewerViewStateChange) => {
    viewerViewState.value = change.state
  }

  return {
    viewerSearchOpen,
    viewerSearchQuery,
    viewerSearchInputRef,
    viewerSearchState,
    viewerAvailability,
    viewerZoomState,
    viewerViewState,
    viewerActionDisabled,
    viewerZoomDisplayLabel,
    viewerZoomResetLabel,
    viewerSearchSummary,
    viewerPageLabel,
    fitCurrentDocument,
    printDirect,
    printWithMask,
    triggerViewerAction,
    selectFitMode,
    runViewerSearch,
    openViewerSearch,
    closeViewerSearch,
    resetViewerSearch,
    nextViewerSearch,
    previousViewerSearch,
    handleViewerAvailabilityChange,
    handleViewerLoadStart,
    handleViewerSearchChange,
    handleViewerZoomChange,
    handleViewerViewStateChange
  }
}

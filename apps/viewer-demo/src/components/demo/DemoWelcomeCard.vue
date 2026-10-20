<script setup lang='ts'>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { FileSearch, ShieldCheck, Upload, X } from '@lucide/vue'
import type { DemoFileIconMeta } from '@/composables/useDemoFileTypes'
import type { DemoWelcomeCopy } from '@/composables/useDemoWelcome'
import DemoFileTypeIcon from '@/components/demo/DemoFileTypeIcon.vue'
import brandLogo from '@/assets/logo.png'

/**
 * First-visit welcome card. Presentational only: the page controller decides
 * visibility and performs the actual source transitions. The surface uses the
 * workbench theme tokens and compact file controls in both color schemes.
 */
export type DemoWelcomeSample = DemoFileIconMeta & { url: string; name: string }

defineProps<{
  copy: DemoWelcomeCopy
  samples: readonly DemoWelcomeSample[]
  accept?: string
}>()

const emit = defineEmits<{
  close: []
  samples: []
  sample: [url: string]
  file: [file: File]
}>()

const dragging = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const cardRef = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  cardRef.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  if (!cardRef.value?.contains(document.activeElement)) return
  const target = previousFocus?.isConnected && previousFocus !== document.body
    ? previousFocus
    : document.querySelector<HTMLElement>('.rail-brand')
  target?.focus({ preventScroll: true })
})

const sampleFormat = (url: string) => (url.split(/[?#]/)[0]?.split('.').pop() || '').toUpperCase()

function chooseFile() {
  fileInputRef.value?.click()
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.files?.item(0)
  if (value) emit('file', value)
  target.value = ''
}

function handleDrop(event: DragEvent) {
  dragging.value = false
  const value = event.dataTransfer?.files?.item(0)
  if (value) emit('file', value)
}
</script>

<template>
  <section
    ref='cardRef'
    class='demo-welcome'
    :class='{ "demo-welcome--dragging": dragging }'
    role='dialog'
    aria-modal='false'
    aria-labelledby='demo-welcome-title'
    tabindex='-1'
    @keydown.esc.stop='emit("close")'
    @dragover.prevent='dragging = true'
    @dragleave='dragging = false'
    @drop.prevent='handleDrop'
  >
    <header class='demo-welcome__header'>
      <img class='demo-welcome__brand' :src='brandLogo' alt='' />
      <div class='demo-welcome__heading'>
        <p class='demo-welcome__eyebrow'>{{ copy.eyebrow }}</p>
        <h2 id='demo-welcome-title'>{{ copy.title }}</h2>
      </div>
      <button type='button' class='demo-welcome__close' :aria-label='copy.close' @click='emit("close")'>
        <X :size='18' :stroke-width='2' aria-hidden='true' />
      </button>
    </header>
    <p class='demo-welcome__description'>{{ copy.description }}</p>

    <div class='demo-welcome__actions'>
      <button type='button' class='demo-welcome__primary' @click='chooseFile'>
        <Upload :size='17' :stroke-width='2.25' aria-hidden='true' />
        <span>{{ copy.chooseFile }}</span>
      </button>
      <button type='button' class='demo-welcome__secondary' @click='emit("samples")'>
        <FileSearch :size='17' :stroke-width='2.25' aria-hidden='true' />
        <span>{{ copy.browseSamples }}</span>
      </button>
      <input ref='fileInputRef' class='demo-welcome__input' type='file' :accept='accept' tabindex='-1' aria-hidden='true' @change='handleInput' />
    </div>
    <p class='demo-welcome__featured-title'>{{ copy.featured }}</p>
    <ul class='demo-welcome__samples' :aria-label='copy.featured'>
      <li v-for='sample in samples' :key='sample.url'>
        <button type='button' :title='sample.name' :aria-label='sample.name' @click='emit("sample", sample.url)'>
          <DemoFileTypeIcon :meta='sample' :size='22' />
          <span>{{ sampleFormat(sample.url) }}</span>
        </button>
      </li>
    </ul>
    <footer class='demo-welcome__hint'>
      <span><ShieldCheck :size='14' aria-hidden='true' />{{ copy.privacy }}</span>
      <span>{{ copy.drop }}</span>
    </footer>
  </section>
</template>

<style scoped>
.demo-welcome {
  position: fixed;
  z-index: 78;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  width: min(640px, calc(100vw - 48px));
  max-height: calc(100dvh - 196px);
  overflow: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  padding: 22px;
  border: 1px solid var(--demo-border-strong);
  border-radius: 24px;
  background: var(--demo-surface-strong);
  color: var(--demo-text);
  backdrop-filter: var(--demo-glass-blur);
  -webkit-backdrop-filter: var(--demo-glass-blur);
}

.demo-welcome:focus {
  outline: none;
}

.demo-welcome--dragging {
  border-color: var(--demo-accent-strong);
  outline: 2px dashed var(--demo-accent-strong);
  outline-offset: -6px;
}

.demo-welcome :where(button) {
  appearance: none;
  font: inherit;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.demo-welcome button:focus-visible {
  outline: 3px solid var(--demo-focus);
  outline-offset: 3px;
}

.demo-welcome__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-welcome__brand {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.demo-welcome__heading {
  flex: 1;
  min-width: 0;
}

.demo-welcome__eyebrow {
  margin: 0 0 3px;
  color: var(--demo-muted);
  font-size: 0.6875rem;
  line-height: 1.4;
  font-weight: 500;
}

.demo-welcome h2 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.3;
  font-weight: 650;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}

.demo-welcome__close {
  flex: 0 0 44px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  align-self: flex-start;
  margin: -6px -6px 0 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--demo-muted);
}

.demo-welcome__close:hover {
  background: var(--demo-surface-soft);
  color: var(--demo-text);
}

.demo-welcome__description {
  margin: 12px 0 0;
  color: var(--demo-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.demo-welcome__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0;
}

.demo-welcome__primary,
.demo-welcome__secondary {
  min-width: 0;
  flex: 1 1 9rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.3;
  box-shadow: none;
}

.demo-welcome__actions svg {
  flex-shrink: 0;
}

.demo-welcome__primary {
  background: var(--demo-accent-strong);
  color: var(--demo-on-accent);
}

.demo-welcome__primary:hover {
  background: var(--demo-action-hover);
}

.demo-welcome__secondary {
  border-color: var(--demo-border-strong);
  background: transparent;
  color: var(--demo-text);
}

.demo-welcome__secondary:hover {
  background: var(--demo-surface-soft);
}

.demo-welcome__input {
  display: none;
}

.demo-welcome__featured-title {
  margin: 0 0 8px;
  color: var(--demo-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
  font-weight: 500;
}

.demo-welcome__samples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 3.5rem), 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.demo-welcome__samples li {
  min-width: 0;
}

.demo-welcome__samples button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 8px;
  border: 1px solid var(--demo-border);
  border-radius: 14px;
  background: var(--demo-surface-soft);
  color: var(--demo-text);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.025em;
}

.demo-welcome__samples button:hover {
  border-color: var(--demo-border-strong);
  background: var(--demo-accent-soft);
}

.demo-welcome__hint {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 16px;
  margin: 14px 0 0;
  color: var(--demo-muted);
  font-size: 0.6875rem;
  line-height: 1.6;
}

.demo-welcome__hint span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.demo-welcome__hint svg {
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .demo-welcome {
    bottom: calc(82px + env(safe-area-inset-bottom));
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 164px);
    padding: 18px;
    border-radius: 22px;
  }

  .demo-welcome h2 {
    font-size: 1.125rem;
  }

  .demo-welcome__brand {
    width: 28px;
    height: 28px;
    flex-basis: 28px;
  }

  .demo-welcome__actions {
    margin: 16px 0;
  }

  .demo-welcome__primary,
  .demo-welcome__secondary {
    padding: 10px 12px;
    border-radius: 16px;
    font-size: 0.75rem;
  }

  .demo-welcome__samples button {
    flex-direction: column;
    gap: 6px;
    min-height: 64px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .demo-welcome {
    animation: demo-welcome-enter 160ms ease-out both;
  }
}

@keyframes demo-welcome-enter {
  from { opacity: 0; translate: 0 6px; }
  to { opacity: 1; translate: 0 0; }
}
</style>

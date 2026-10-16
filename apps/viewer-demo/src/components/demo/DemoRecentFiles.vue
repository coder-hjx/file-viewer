<script setup lang='ts'>
import { History, X } from '@lucide/vue'
import type { DemoRecentFile } from '@/composables/useDemoRecentFiles'
import type { DemoFileIconMeta } from '@/composables/useDemoFileTypes'
import DemoFileTypeIcon from '@/components/demo/DemoFileTypeIcon.vue'

/**
 * Presentational recent-history card.
 *
 * Persistence, deduplication and local File lifetime stay in the composable/page
 * controller; this component only renders accessible open/dismiss actions.
 */
export type DemoRecentFileDisplayEntry = DemoRecentFile & DemoFileIconMeta & {
  timeLabel: string
  timeIso: string
}

export interface DemoRecentFilesCopy {
  title: string
  close: string
  open: string
  dismiss: string
}

defineProps<{
  entries: readonly DemoRecentFileDisplayEntry[]
  copy: DemoRecentFilesCopy
}>()

const emit = defineEmits<{
  open: [entry: DemoRecentFile]
  dismiss: [id: string]
  close: []
}>()

const labelWithName = (label: string, name: string): string => (
  label.includes('{name}')
    ? label.replace('{name}', name)
    : `${label}: ${name}`
)

const fileTypeLabel = (entry: DemoRecentFileDisplayEntry): string => {
  // MIME types are too wide for the compact badge. Prefer the visible filename
  // extension, then a short non-MIME type or icon label.
  const cleanTarget = entry.iconTarget.split(/[?#]/, 1)[0] || ''
  const fileName = cleanTarget.split('/').at(-1) || entry.name
  const extension = fileName.includes('.') ? fileName.split('.').at(-1) || '' : ''
  const type = entry.type.includes('/') ? '' : entry.type
  return (extension || type || entry.icon).toUpperCase().slice(0, 7)
}
</script>

<template>
  <aside class='demo-recent-files' :aria-label='copy.title'>
    <header class='demo-recent-files__header'>
      <span class='demo-recent-files__heading'>
        <History :size='18' :stroke-width='2' aria-hidden='true' />
        <strong>{{ copy.title }}</strong>
      </span>
      <button
        type='button'
        class='demo-recent-files__close'
        :aria-label='copy.close'
        @click='emit("close")'
      >
        <X :size='16' :stroke-width='2.25' aria-hidden='true' />
      </button>
    </header>

    <ul class='demo-recent-files__list'>
      <li v-for='entry in entries' :key='entry.id' class='demo-recent-files__item'>
        <button
          type='button'
          class='demo-recent-files__open'
          :aria-label='labelWithName(copy.open, entry.name)'
          @click='emit("open", entry)'
        >
          <DemoFileTypeIcon :meta='entry' :size='30' />
          <span class='demo-recent-files__file-copy'>
            <strong :title='entry.name'>{{ entry.name }}</strong>
            <span>{{ fileTypeLabel(entry) }}</span>
          </span>
          <time class='demo-recent-files__time' :datetime='entry.timeIso'>{{ entry.timeLabel }}</time>
        </button>
        <button
          type='button'
          class='demo-recent-files__dismiss'
          :aria-label='labelWithName(copy.dismiss, entry.name)'
          @click.stop='emit("dismiss", entry.id)'
        >
          <X :size='14' :stroke-width='2.25' aria-hidden='true' />
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.demo-recent-files {
  position: fixed;
  z-index: 34;
  left: clamp(18px, 2.3vw, 34px);
  bottom: clamp(20px, 3.2vh, 34px);
  width: min(252px, calc(100vw - 36px));
  max-height: min(390px, calc(100vh - 40px));
  max-height: min(390px, calc(100dvh - 40px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    0 24px 58px rgba(42, 58, 70, 0.13),
    0 5px 14px rgba(42, 58, 70, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px) saturate(1.24);
  -webkit-backdrop-filter: blur(24px) saturate(1.24);
  animation: recent-files-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.demo-recent-files::before {
  content: '';
  position: absolute;
  z-index: 1;
  left: 0;
  top: 56px;
  bottom: 16px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #38bd7b, #12935c);
  box-shadow: 0 0 18px rgba(33, 163, 102, 0.28);
}

.demo-recent-files button {
  appearance: none;
  border: 0;
  font: inherit;
}

.demo-recent-files__header {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 8px 17px;
  border-bottom: 1px solid rgba(31, 49, 63, 0.065);
}

.demo-recent-files__heading {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #526477;
}

.demo-recent-files__heading strong {
  overflow: hidden;
  color: #334457;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-recent-files__close,
.demo-recent-files__dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: transparent;
  color: #7d8c9a;
  cursor: pointer;
  transition:
    color 150ms ease,
    background 150ms ease,
    opacity 150ms ease,
    transform 150ms ease;
}

.demo-recent-files__close {
  width: 34px;
  height: 34px;
}

.demo-recent-files__close:hover,
.demo-recent-files__dismiss:hover {
  background: rgba(48, 65, 80, 0.075);
  color: #263849;
}

.demo-recent-files__close:active,
.demo-recent-files__dismiss:active {
  transform: scale(0.93);
}

.demo-recent-files__list {
  min-height: 0;
  margin: 0;
  padding: 7px;
  overflow-x: hidden;
  overflow-y: auto;
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(76, 96, 112, 0.2) transparent;
}

.demo-recent-files__item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px;
  align-items: center;
  min-height: 58px;
  border: 1px solid transparent;
  border-radius: 16px;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.demo-recent-files__item:hover,
.demo-recent-files__item:focus-within {
  border-color: rgba(33, 163, 102, 0.12);
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 8px 22px rgba(46, 67, 81, 0.07);
}

.demo-recent-files__open {
  min-width: 0;
  min-height: 56px;
  display: grid;
  grid-template-columns: 31px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px 3px 7px 10px;
  border-radius: 15px;
  background: transparent;
  color: #182838;
  text-align: left;
  cursor: pointer;
}

.demo-recent-files__time {
  color: #8795a2;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.demo-recent-files__file-copy {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.demo-recent-files__file-copy strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-recent-files__file-copy > span {
  padding: 3px 5px;
  border-radius: 999px;
  background: rgba(66, 84, 100, 0.07);
  color: #768697;
  font-size: 8px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: 0.025em;
}

.demo-recent-files__dismiss {
  width: 28px;
  height: 28px;
  margin-right: 2px;
  opacity: 0;
}

.demo-recent-files__item:hover .demo-recent-files__dismiss,
.demo-recent-files__item:focus-within .demo-recent-files__dismiss {
  opacity: 1;
}

.demo-recent-files :is(button):focus-visible {
  outline: 2px solid rgba(33, 163, 102, 0.72);
  outline-offset: 2px;
}

:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files {
  border-color: rgba(204, 224, 235, 0.1);
  background: rgba(17, 28, 36, 0.72);
  box-shadow:
    0 26px 64px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__header {
  border-color: rgba(204, 224, 235, 0.08);
}

:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__heading,
:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__close,
:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__dismiss {
  color: #9fb1bf;
}

:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__heading strong,
:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__open {
  color: #e7f0f5;
}

:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__item:hover,
:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__item:focus-within {
  border-color: rgba(45, 212, 154, 0.16);
  background: rgba(229, 242, 248, 0.07);
}

:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__file-copy > span {
  background: rgba(229, 242, 248, 0.08);
  color: #9fb1bf;
}

:global(.demo-shell[data-demo-theme='dark']) .demo-recent-files__time {
  color: #91a4b3;
}

@media (hover: none) {
  .demo-recent-files__dismiss {
    opacity: 0.76;
  }
}

@media (max-width: 720px) {
  .demo-recent-files {
    left: 12px;
    right: 12px;
    bottom: calc(76px + env(safe-area-inset-bottom));
    width: auto;
    max-height: min(350px, calc(100vh - 112px));
    max-height: min(350px, calc(100dvh - 112px));
    border-radius: 20px;
  }

  .demo-recent-files__list {
    padding-bottom: 8px;
  }

  .demo-recent-files__item {
    min-height: 60px;
  }

  .demo-recent-files__dismiss {
    width: 32px;
    height: 32px;
    opacity: 0.72;
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo-recent-files {
    animation: none;
  }

  .demo-recent-files *,
  .demo-recent-files *::before,
  .demo-recent-files *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

@keyframes recent-files-enter {
  from {
    opacity: 0;
    transform: translate3d(-8px, 10px, 0) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>

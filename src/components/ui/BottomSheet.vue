<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useBackDismiss } from '@/composables/useBackButton'

const props = defineProps<{
  isOpen: boolean
  title?: string
  // Denk-Zustand: das Sheet bleibt offen und glüht (Aura + Hairline + Leiste),
  // Schließen ist währenddessen gesperrt. Der Inhalt (Denk-Zeile) kommt vom
  // Aufrufer über den Slot.
  thinking?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// Android-Zurück schließt das Sheet, statt die App zu verlassen. Weil jedes
// Sheet der App auf dieser Komponente aufbaut, reicht diese eine Zeile. Im
// Denk-Zustand nicht schließen.
useBackDismiss(toRef(props, 'isOpen'), () => { if (!props.thinking) emit('close') })

function requestClose() {
  if (!props.thinking) emit('close')
}

// ── Downward-swipe-to-close ──────────────────────────────────
// Ein nach unten gezogenes Sheet folgt dem Finger und schließt beim Loslassen,
// sobald ein Schwellwert überschritten ist. Greift nur, wenn der Sheet-Inhalt
// bereits oben steht (scrollTop <= 0), damit normales Scrollen unberührt bleibt.
const surfaceEl = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let tracking = false
const CLOSE_THRESHOLD = 110

function onTouchStart(e: TouchEvent) {
  if (props.thinking) { tracking = false; return }
  if ((surfaceEl.value?.scrollTop ?? 0) > 0) { tracking = false; return }
  startY = e.touches[0].clientY
  tracking = true
  dragging.value = false
}

function onTouchMove(e: TouchEvent) {
  if (!tracking) return
  const dy = e.touches[0].clientY - startY
  // Nur nach unten ziehen; solange oben gescrollt.
  if (dy > 0 && (surfaceEl.value?.scrollTop ?? 0) <= 0) {
    dragging.value = true
    // leichter Widerstand für ein natürlicheres Gefühl
    dragY.value = dy < 0 ? 0 : dy * 0.85
    e.preventDefault()
  } else if (dy <= 0 && dragging.value) {
    dragY.value = 0
  }
}

function onTouchEnd() {
  if (!tracking) return
  tracking = false
  if (dragY.value > CLOSE_THRESHOLD) {
    emit('close')
  }
  dragging.value = false
  dragY.value = 0
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-backdrop">
      <div v-if="isOpen" class="backdrop" @click="requestClose" />
    </Transition>
    <Transition name="sheet-grow">
      <div
        v-if="isOpen"
        class="sheet"
        :class="{ 'sheet--thinking': thinking }"
        :style="dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined"
        role="dialog"
        @click.stop
      >
        <!-- Atmende Gradient-Aura hinter dem Sheet (nur im Denk-Zustand). -->
        <div v-if="thinking" class="sheet-aura" aria-hidden="true" />

        <div
          ref="surfaceEl"
          class="sheet-surface"
          :class="{ 'sheet-surface--dragging': dragging }"
          @touchstart.passive="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <button
            v-if="!thinking"
            class="sheet-close"
            type="button"
            aria-label="Schließen"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          </button>
          <div class="sheet-handle" />
          <div v-if="title && !thinking" class="sheet-title">{{ title }}</div>
          <slot />
        </div>

        <!-- Indeterminierte Fortschrittsleiste unten (nur im Denk-Zustand). -->
        <div v-if="thinking" class="sheet-progress" aria-hidden="true"><span /></div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(60, 45, 30, 0.38);
  z-index: 1000;
}

/* Positionierungs-Shell: KEIN eigener Hintergrund/kein Clipping — damit die Aura
   dahinter (erstes, positioniertes Kind) hinter der opaken Surface glühen und
   über die Kanten hinausblenden kann. */
.sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  /* grows out of the FAB, which lives in the bottom-right corner */
  transform-origin: bottom right;
}

.sheet-surface {
  position: relative;
  z-index: 1;
  background: var(--surface);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  border: 1px solid var(--border-soft);
  border-bottom: none;
  padding: 12px var(--screen-pad) 0;
  padding-bottom: calc(24px + var(--safe-bottom));
  max-height: 92dvh;
  overflow-y: auto;
}

/* Denk-Zustand: die Sheet-Fläche SELBST wird zum animierten Glow-Gradient
   (Scrim darüber hält weißen Inhalt lesbar). Inhalt/Loader/Buttons werden weiß. */
.sheet--thinking .sheet-surface {
  background: var(--ai-scrim), var(--ai-gradient);
  background-size: 100% 100%, var(--ai-gradient-size);
  border-color: transparent;
  color: #fff;
  animation: aiShift 6s ease-in-out infinite;
}

.sheet--thinking .sheet-handle {
  background: rgba(255, 255, 255, 0.6);
}

/* Während des Ziehens folgt das Sheet direkt dem Finger (keine Transition). */
.sheet-surface--dragging {
  transition: none !important;
}

/* ── Denk-Zustand ───────────────────────────────────────────── */
/* Aura HINTER der opaken Surface (z-index 0 < surface 1), ragt nur als weicher
   Schein über die Kanten. Auf einem vollbreiten Sheet liegt der seitliche
   Schein außerhalb des Viewports — der Oberkanten-Schein trägt daher den Effekt,
   deshalb top: -14px (statt der -5px aus der Phone-Mockup-Referenz, wo der
   Geräterahmen den Seiten-Schein noch zeigt). */
.sheet-aura {
  position: absolute;
  left: -3px;
  right: -3px;
  top: -14px;
  bottom: 0;
  z-index: 0;
  border-radius: 32px 32px 0 0;
  background: var(--ai-gradient);
  background-size: 300% 300%;
  filter: blur(22px);
  opacity: 0.82;
  animation: aiShift 4s ease-in-out infinite, edgeBreath 2.8s ease-in-out infinite;
  pointer-events: none;
}

/* Kein Gradient-Hairline mehr (bewusst entfernt) — nur die weiche Aura. */

.sheet-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  z-index: 2;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.22);
  border-bottom-left-radius: var(--radius-sheet);
  border-bottom-right-radius: var(--radius-sheet);
}

.sheet-progress span {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  background: #fff;
  animation: barSlide 1.6s ease-in-out infinite;
}

.sheet-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--surface-deep);
  color: var(--text-secondary);
  cursor: pointer;
  z-index: 2;
  transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
}

.sheet-close:active {
  transform: scale(0.9);
  background: var(--border-softer);
  color: var(--text);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 20px;
}

.sheet-title {
  font-family: var(--font-headline);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 20px;
  padding-right: 40px;
}

/* Grow from FAB: playful overshoot on open, crisp (no bounce) on close */
.sheet-grow-enter-active {
  transition: transform var(--dur-sheet-open) var(--ease-overshoot),
              opacity 240ms var(--ease-standard);
}

.sheet-grow-leave-active {
  transition: transform var(--dur-sheet-close) var(--ease-in),
              opacity 200ms var(--ease-in);
}

.sheet-grow-enter-from,
.sheet-grow-leave-to {
  opacity: 0;
  transform: scale(0.3) translateY(20%);
}

.sheet-grow-enter-to,
.sheet-grow-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.sheet-backdrop-enter-active {
  transition: opacity 300ms var(--ease-standard);
}

.sheet-backdrop-leave-active {
  transition: opacity 240ms var(--ease-in);
}

.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to {
  opacity: 0;
}
</style>

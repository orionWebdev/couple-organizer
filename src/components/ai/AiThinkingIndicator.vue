<script setup lang="ts">
import { computed } from 'vue'

// Inline-Denk-Zustand — der Screen bleibt sichtbar. Zwei Layouts, per `mode`
// gewählt (Weiche in useAiThinking): 'edge' = Rand-Glow an der App-Shell (nur
// installierte PWA, kurze Task), 'dock' = Denk-Leiste mit Fortschritt + ETA +
// Abbrechen (Browser-Tab / lange Task). Werte 1:1 aus dem Design-Handoff.
const props = defineProps<{
  mode: 'edge' | 'dock'
  status: string
  subtitle?: string
  etaSeconds?: number | null
  progress?: number // 0..1
}>()

const emit = defineEmits<{ cancel: [] }>()

const fillPct = computed(() => `${Math.round((props.progress ?? 0) * 100)}%`)
const showEta = computed(() => typeof props.etaSeconds === 'number')
</script>

<template>
  <!-- 4a · Rand-Glow (an der App-Shell, Safe-Areas eingerückt) -->
  <div v-if="mode === 'edge'" class="edge-think" role="status" aria-live="polite">
    <div class="edge-ring edge-ring--bleed" aria-hidden="true" />
    <div class="edge-ring edge-ring--edge" aria-hidden="true" />
    <div class="edge-pill">
      <span class="mini-mark" aria-hidden="true"><i /><i /></span>
      <span>{{ status }}</span>
    </div>
  </div>

  <!-- 4b · Denk-Leiste (Assistant-Dock) -->
  <div v-else class="dock-think" role="status" aria-live="polite">
    <span class="mini-mark" aria-hidden="true"><i /><i /></span>
    <span class="dock-txt">
      <b>{{ status }}</b>
      <i>
        <template v-if="subtitle">{{ subtitle }}</template>
        <template v-if="subtitle && showEta"> · </template>
        <template v-if="showEta">noch ~<b>{{ etaSeconds }}</b> Sek.</template>
      </i>
    </span>
    <button type="button" class="dock-cancel" @click="emit('cancel')">Abbrechen</button>
    <span class="dock-bar" aria-hidden="true">
      <span class="dock-fill" :style="{ width: fillPct }" />
    </span>
  </div>
</template>

<style scoped>
/* ── Mini-Marken-Loader (die zwei TwoDo-Kreise) ────────────── */
.mini-mark {
  position: relative;
  width: 26px;
  height: 16px;
  flex: none;
  animation: aiSpin 2.2s linear infinite;
}

.mini-mark i {
  position: absolute;
  top: 50%;
  margin-top: -8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.mini-mark i:first-child {
  left: 0;
  background: #fff;
  animation: aiPulse 1.6s ease-in-out infinite;
}

.mini-mark i:last-child {
  right: 0;
  background: rgba(255, 255, 255, 0.34);
  box-shadow: inset 0 0 0 2px #fff;
  animation: aiPulse 1.6s ease-in-out 0.8s infinite;
}

/* ── 4a · Rand-Glow ────────────────────────────────────────── */
.edge-think {
  position: fixed;
  z-index: 1090;
  pointer-events: none;
  /* An der App-Shell, Safe-Areas eingerückt (Notch/Home-Indicator/URL-Leiste). */
  inset: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0)
    env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
}

.edge-ring {
  position: absolute;
  inset: 0;
  border-radius: 35px;
  background: var(--ai-gradient);
  background-size: 300% 300%;
  /* Nur der Rahmen bleibt sichtbar: Content-Box ausgestanzt (xor/exclude). */
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.edge-ring--bleed {
  padding: 11px;
  filter: blur(9px);
  animation: aiShift 4s ease-in-out infinite, edgeBreath 2.6s ease-in-out infinite;
}

.edge-ring--edge {
  padding: 3px;
  filter: blur(1px);
  animation: aiShift 4s ease-in-out infinite;
}

.edge-pill {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px 9px 13px;
  border-radius: 999px;
  background: var(--ai-scrim), var(--ai-gradient);
  background-size: 100% 100%, var(--ai-gradient-size);
  box-shadow: var(--ai-glow);
  color: #fff;
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 13px;
  text-shadow: var(--ai-textshadow);
  white-space: nowrap;
  animation: aiShift 6s ease-in-out infinite;
}

/* ── 4b · Denk-Leiste ──────────────────────────────────────── */
.dock-think {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(18px + env(safe-area-inset-bottom, 0));
  z-index: 1090;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 16px 18px;
  border-radius: 20px;
  background: var(--ai-scrim), var(--ai-gradient);
  background-size: 100% 100%, var(--ai-gradient-size);
  box-shadow: var(--ai-glow), 0 12px 26px rgba(60, 45, 30, 0.28);
  color: #fff;
  text-shadow: var(--ai-textshadow);
  animation: aiShift 6s ease-in-out infinite, dockIn 0.34s var(--ease-overshoot) both;
}

.dock-txt {
  flex: 1;
  min-width: 0;
}

.dock-txt b {
  display: block;
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 14.5px;
}

.dock-txt i {
  font-style: normal;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.dock-txt i b {
  display: inline;
  font-weight: 800;
  color: #fff;
}

.dock-cancel {
  flex: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 8px 14px; /* Touch-Target ≥ 36px hoch, gut greifbar */
  text-shadow: none;
}

.dock-cancel:active {
  transform: scale(0.96);
}

.dock-bar {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 9px;
  height: 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.28);
  overflow: hidden;
}

/* Breite JS-getrieben (determiniert) — läuft auch unter reduced-motion. */
.dock-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: #fff;
  border-radius: 3px;
  transition: width 0.24s var(--ease-standard);
}
</style>

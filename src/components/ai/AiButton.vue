<script setup lang="ts">
import AiMarkLoader from './AiMarkLoader.vue'

// Der eine KI-Einstieg. Ersetzt die vier handgebauten Gradient-Buttons.
// Zwei Varianten: 'card' (voller Einstieg) und 'pill' (kompakt, z. B. im
// Kartenkopf des Finanz-Coach).
//
// Direkt-Auslöser OHNE Sheet (Finanz-Coach) verankern ihren Denk-Zustand am
// Button selbst — §6·A Auslöser-Halo: `thinking` blendet den Inhalt aus, zeigt
// Loader (weiß, auf dem Gradient) + Status und legt einen atmenden Schein
// dahinter. Sheet-Auslöser (Küche, Rezept-Wiki) lassen `thinking` weg — die
// glühen im Sheet.
withDefaults(
  defineProps<{
    variant?: 'card' | 'pill'
    icon?: string
    title: string
    subtitle?: string
    locked?: boolean
    thinking?: boolean
    thinkingStatus?: string
  }>(),
  { variant: 'card', icon: '✨', locked: false, thinking: false },
)

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="ai-btn"
    :class="[`ai-btn--${variant}`, { 'is-thinking': thinking }]"
    @click="$emit('click')"
  >
    <!-- 6·A · Auslöser-Halo hinter dem Button -->
    <span v-if="thinking" class="ai-btn-halo" aria-hidden="true" />

    <!-- Denk-Zustand: Inhalt weg, Loader + Status -->
    <span v-if="thinking" class="ai-btn-think" role="status" aria-live="polite">
      <AiMarkLoader :size="22" />
      <span v-if="thinkingStatus" class="ai-btn-tlabel">{{ thinkingStatus }}</span>
    </span>

    <!-- Ruhezustand -->
    <template v-else>
      <span v-if="variant === 'card'" class="ai-btn-chip">{{ icon }}</span>
      <span v-else class="ai-btn-pchip">{{ icon }}</span>

      <span v-if="variant === 'card'" class="ai-btn-txt">
        <b>{{ title }}</b>
        <i v-if="subtitle">{{ subtitle }}</i>
      </span>
      <span v-else class="ai-btn-plabel">{{ title }}</span>

      <template v-if="variant === 'card'">
        <!-- Plus-Badge-Slot: gesperrtes Feature zeigt "PLUS" statt Chevron -->
        <slot name="badge">
          <span v-if="locked" class="ai-btn-badge">PLUS</span>
          <span v-else class="ai-btn-chev" aria-hidden="true">›</span>
        </slot>
      </template>
    </template>
  </button>
</template>

<style scoped>
/* Zweilagiger Hintergrund: fixer Scrim (100%) über wanderndem Gradient — sonst
   wird weißer Text in der hellen Amber-Phase unlesbar. Theme-unabhängig.
   position:relative (ohne z-index) hält den Halo dahinter, ohne einen eigenen
   Stacking-Context zu erzeugen. */
.ai-btn {
  position: relative;
  border: none;
  cursor: pointer;
  color: #fff;
  font-family: var(--font-body);
  text-align: left;
  background: var(--ai-scrim), var(--ai-gradient);
  background-size: 100% 100%, var(--ai-gradient-size);
  box-shadow: var(--ai-glow);
  animation: aiShift 6s ease-in-out infinite;
  transition: transform 0.12s ease;
}

.ai-btn:active {
  transform: scale(0.98);
}

/* Denk-Zustand: Button atmet leicht mit. */
.ai-btn.is-thinking {
  animation: aiShift 6s ease-in-out infinite, aiBreath 2.6s ease-in-out infinite;
}

/* ── 6·A · Auslöser-Halo ───────────────────────────────────── */
.ai-btn-halo {
  position: absolute;
  inset: -7px;
  z-index: -1;
  border-radius: 26px;
  background: var(--ai-gradient);
  background-size: 300% 300%;
  filter: blur(16px);
  opacity: 0.72;
  animation: aiShift 4s ease-in-out infinite, edgeBreath 2.6s ease-in-out infinite;
  pointer-events: none;
}

.ai-btn--pill .ai-btn-halo {
  inset: -6px;
  border-radius: 999px;
}

/* Loader (weiß, auf dem Gradient) + Status */
.ai-btn-think {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  --ai-mark: #fff;
}

.ai-btn-tlabel {
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  text-shadow: var(--ai-textshadow);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Variante card ─────────────────────────────────────────── */
.ai-btn--card {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 15px;
  border-radius: 20px;
}

.ai-btn-chip {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.14);
}

.ai-btn-txt {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  line-height: 1.25;
  text-shadow: var(--ai-textshadow);
}

.ai-btn-txt b {
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 16px;
}

.ai-btn-txt i {
  font-style: normal;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 1px;
}

.ai-btn-chev {
  font-size: 26px;
  line-height: 1;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.92);
  margin-right: 2px;
}

.ai-btn-badge {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
}

/* ── Variante pill ─────────────────────────────────────────── */
.ai-btn--pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 15px 9px 12px;
  border-radius: 999px;
}

/* Im Denk-Zustand darf die Pill wachsen, damit Loader + Status Platz haben. */
.ai-btn--pill.is-thinking {
  padding: 9px 16px;
}

.ai-btn-pchip {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.24);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.ai-btn-plabel {
  font-weight: 800;
  font-size: 13.5px;
  text-shadow: var(--ai-textshadow);
}
</style>

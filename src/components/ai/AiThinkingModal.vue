<script setup lang="ts">
// „Fertig" — Bloom & Reveal (§5). Die frühere Vollbild-Dauer-Denkphase ist
// nach inline (Rand-Glow / Denk-Leiste) gewandert; vom Vollbild bleibt nur
// noch dieser kurze Übergang (~480 ms) direkt vor dem Ergebnis: der Gradient
// blitzt auf, hellt aus und ein weißer Bloom räumt das Bild frei.
defineProps<{ open: boolean }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="ai-bloom-fade">
      <div v-if="open" class="ai-bloom-layer" aria-hidden="true">
        <div class="ai-bloom-grad" />
        <div class="ai-bloom-flash" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-bloom-layer {
  position: fixed;
  inset: 0;
  z-index: 1110; /* über Indicator (1090) und Sheets (1001) */
  overflow: hidden;
  pointer-events: none;
}

.ai-bloom-grad {
  position: absolute;
  inset: 0;
  background: var(--ai-gradient);
  background-size: var(--ai-gradient-size);
  animation: aiShift 4s ease-in-out infinite, aiBrighten 0.48s ease-out forwards;
}

.ai-bloom-flash {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 200px;
  height: 200px;
  margin: -100px 0 0 -100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.4) 40%, transparent 70%);
  opacity: 0;
  transform: scale(0.2);
  animation: aiBloom 0.48s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.ai-bloom-fade-enter-active {
  transition: opacity 0.12s ease;
}

.ai-bloom-fade-leave-active {
  transition: opacity 0.32s ease;
}

.ai-bloom-fade-enter-from,
.ai-bloom-fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
// Mini-Marken-Loader: die zwei TwoDo-Kreise, die umeinander kreisen. Auf hellem
// Grund (Sheet/Karte) in Akzent-Lila statt Weiß, damit er trägt.
withDefaults(defineProps<{ size?: number }>(), { size: 26 })
</script>

<template>
  <span class="ai-mark" :style="{ width: size + 'px', height: Math.round(size * 0.62) + 'px' }" aria-hidden="true">
    <i /><i />
  </span>
</template>

<style scoped>
.ai-mark {
  position: relative;
  display: inline-block;
  flex: none;
  animation: aiSpin 2.2s linear infinite;
}

.ai-mark i {
  position: absolute;
  top: 50%;
  height: 62%;
  aspect-ratio: 1;
  margin-top: -31%;
  border-radius: 50%;
}

/* --ai-mark: Akzent-Lila, theme-abhängig (auf dunklem Grund heller). */
.ai-mark i:first-child {
  left: 0;
  background: var(--ai-mark, #9b72cb);
  animation: aiPulse 1.6s ease-in-out infinite;
}

.ai-mark i:last-child {
  right: 0;
  background: color-mix(in srgb, var(--ai-mark, #9b72cb) 34%, transparent);
  box-shadow: inset 0 0 0 2px var(--ai-mark, #9b72cb);
  animation: aiPulse 1.6s ease-in-out 0.8s infinite;
}
</style>

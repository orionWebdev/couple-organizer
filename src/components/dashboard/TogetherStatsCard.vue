<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { TogetherStats } from '@/utils/togetherStats'

// Der Rückblick am Ende des Dashboards — man scrollt an allem Heutigen vorbei
// und landet bei dem, was zu zweit entstanden ist. Diese Position ist Absicht:
// oben steht, was ansteht, unten, was ihr geschafft habt.
//
// Einzige Fläche der App ohne Aufteilung nach Person. Hier gibt es kein „wer
// mehr" — das ist der ganze Punkt.
defineProps<{ stats: TogetherStats }>()

// Ein gemeinsamer Fortschritt für alle Zahlen statt einer Animation je Zahl:
// `useCountUp` ist ein Composable und dürfte nicht pro Schleifendurchlauf
// aufgerufen werden. Gleiches Muster wie die Balken im Finanz-Coach.
const anim = ref(0)
let raf = 0

onMounted(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  if (reduced) {
    anim.value = 1
    return
  }
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / 900)
    anim.value = 1 - Math.pow(1 - t, 3) // easeOutCubic
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div v-if="stats.hasEnough" class="tg">
    <span class="tg-lab">Was ihr zusammen geschafft habt</span>
    <div class="tg-grid">
      <div v-for="s in stats.stats" :key="s.key" class="tg-item">
        <span class="tg-val">{{ Math.round(s.value * anim) }}</span>
        <span class="tg-cap">{{ s.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tg {
  margin-top: 10px;
  padding: 18px;
  border-radius: var(--radius-card-lg);
  /* Warmer Akzent statt weißer Karte: das hier ist kein Werkzeug, sondern
     ein Rückblick — es darf sich anders anfühlen als der Rest der Seite. */
  background: var(--accent-tint);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.tg-lab {
  display: block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-bottom: 14px;
}

.tg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 10px;
}

.tg-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tg-val {
  font-family: var(--font-headline);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.05;
}

.tg-cap {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  line-height: 1.35;
}
</style>

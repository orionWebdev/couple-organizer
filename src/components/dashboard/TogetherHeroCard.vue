<script setup lang="ts">
// Das Herzstück des Wir-Tabs (Variante A): das Erreichte, warm gerahmt, ganz
// oben — Wertschätzung vor Bilanz. Löst die frühere nüchterne
// TogetherStatsCard am Fuß ab und führt stattdessen die Seite an.
//
// Drei KURATIERTE Zahlen (nicht alle sechs) + eine echte, warme Zeile
// (`highlight`, vom Wir-Tab aus echten Daten gebaut). Getönter Verlauf in den
// beiden Personenfarben — die einzige Verlaufsfläche der App, bewusst hier,
// weil dieser eine Ort sich anders anfühlen darf als der Rest.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { TogetherStats, TogetherStat } from '@/utils/togetherStats'

const props = defineProps<{
  stats: TogetherStats
  /** Eine warme, datengetragene Zeile (z. B. „Als Nächstes zu zweit: …"). */
  highlight: string
}>()

// Kuratierte Auswahl statt aller sechs: die paar-bedeutsamsten zuerst, nur mit
// Wert > 0, mit wärmeren Labels. Höchstens drei.
const WARM_LABEL: Partial<Record<TogetherStat['key'], string>> = {
  chores: 'Aufgaben erledigt',
  meals: 'Abende zu zweit',
  ideas: 'Ideen umgesetzt',
  trips: 'Reisen',
  days: 'Tage zusammen',
  bookings: 'Termine',
}
const PRIORITY: TogetherStat['key'][] = ['chores', 'meals', 'ideas', 'trips', 'days', 'bookings']

const tiles = computed(() => {
  const byKey = new Map(props.stats.stats.map((s) => [s.key, s]))
  const picked: { key: string; value: number; label: string }[] = []
  for (const key of PRIORITY) {
    const s = byKey.get(key)
    if (s && s.value > 0) picked.push({ key, value: s.value, label: WARM_LABEL[key] ?? s.label })
    if (picked.length === 3) break
  }
  return picked
})

// Gemeinsamer Zähl-Fortschritt (Muster wie zuvor), respektiert reduced-motion.
const anim = ref(0)
let raf = 0
onMounted(() => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true) { anim.value = 1; return }
  const start = performance.now()
  const tick = (now: number) => {
    anim.value = 1 - Math.pow(1 - Math.min(1, (now - start) / 900), 3)
    if (anim.value < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<template>
  <div v-if="stats.hasEnough" class="hero">
    <div class="hero__kick">Zusammen</div>
    <p class="hero__line">{{ highlight }}</p>
    <div class="hero__stats">
      <div v-for="t in tiles" :key="t.key" class="hero__stat">
        <b class="mono">{{ Math.round(t.value * anim) }}</b>
        <span>{{ t.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  border-radius: var(--radius-card-lg);
  padding: 18px;
  /* Warmer Verlauf in den beiden Personenfarben — die eine Verlaufsfläche der
     App. Bewusst hier: der Rückblick darf sich anders anfühlen als der Rest. */
  background: linear-gradient(150deg, var(--planung-tint), color-mix(in srgb, var(--sarah-tint) 55%, var(--surface)));
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.hero__kick {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--planung);
}

.hero__line {
  font-family: var(--font-headline);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text);
  margin: 6px 0 14px;
}

.hero__stats {
  display: flex;
  gap: 8px;
}

.hero__stat {
  flex: 1;
  text-align: center;
  background: color-mix(in srgb, var(--surface) 78%, transparent);
  border-radius: 14px;
  padding: 11px 6px;
  min-width: 0;
}

.hero__stat b {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}

.hero__stat span {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  color: var(--text-meta);
  margin-top: 3px;
  line-height: 1.25;
}
</style>

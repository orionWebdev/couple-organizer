<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Couple, FinanceMonthComparison } from '@/types'
import { resolveExpenseCategories, categoryMeta } from '@/utils/expenseCategories'
import { suggestFinanceInsight, type FinanceCategoryDelta } from '@/services/ai'
import { showPaywall } from '@/composables/usePaywall'
import { useCouple } from '@/composables/useCouple'

// Als Finanzen-Tab eingebettet statt eigener Route — bekommt die schon in
// FinanzenView laufenden Daten als Props statt eine zweite useExpenses-
// Instanz für dieselbe Seite zu starten.
const props = defineProps<{
  couple: Couple | null
  months: readonly FinanceMonthComparison[]
  loading: boolean
}>()

const { isPremium } = useCouple()

const categories = computed(() => resolveExpenseCategories(props.couple))

function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

// ── Monatsfilter ─────────────────────────────────────────────
// months ist absteigend sortiert (neuester zuerst). Ohne aktive Auswahl fällt
// activeMonth auf den ersten Eintrag zurück — also den aktuellen Monat beim
// Öffnen der Seite (Komponente wird beim Tab-Wechsel neu erstellt).
const selectedMonthKey = ref<string | null>(null)

const activeMonth = computed<FinanceMonthComparison | null>(() =>
  props.months.find((m) => m.monthKey === selectedMonthKey.value) ?? props.months[0] ?? null
)

// ── Balken-Animation (wie Haushalt-Punktestand) ──────────────
const anim = ref(0)
let raf = 0

function runAnim() {
  if (raf) cancelAnimationFrame(raf)
  anim.value = 0
  const start = performance.now()
  const duration = 900
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    anim.value = 1 - Math.pow(1 - t, 3) // easeOutCubic
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  requestAnimationFrame(runAnim)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})

// Beim Monatswechsel Balken erneut hochwachsen lassen.
watch(() => activeMonth.value?.monthKey, () => runAnim())

const bars = computed(() => {
  const month = activeMonth.value
  if (!month) return []
  const maxCents = Math.max(...month.categories.map((c) => c.current), 1)
  return month.categories.map((c) => {
    const meta = categoryMeta(categories.value, c.categoryId)
    return {
      ...c,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,
      widthPct: Math.round((c.current / maxCents) * 100),
    }
  })
})

const animatedTotal = computed(() => Math.round((activeMonth.value?.total ?? 0) * anim.value))

// ── AI-Insight pro Monat (einmalig geladen, danach gecacht) ──
// 'locked' = Free-Tier. Der Callable lehnt den Aufruf ab, bevor Gemini
// überhaupt gefragt wird — die Karte wird dann zum Teaser statt zum Fehler.
interface InsightState { text: string; error: boolean; locked: boolean }
const insightCache = ref<Record<string, InsightState>>({})
const insightLoading = ref(false)
let insightToken = 0

async function loadInsightFor(month: FinanceMonthComparison | null) {
  if (!month || month.categories.length === 0) return
  if (!props.couple) return
  if (insightCache.value[month.monthKey]) return // schon geladen

  // Ohne Premium den Callable gar nicht erst aufrufen — er würde ohnehin
  // ablehnen. Der Server bleibt trotzdem die maßgebliche Prüfung.
  if (!isPremium.value) {
    insightCache.value[month.monthKey] = { text: '', error: false, locked: true }
    return
  }

  const token = ++insightToken
  insightLoading.value = true
  try {
    const deltas: FinanceCategoryDelta[] = month.categories.map((c) => ({
      name: categoryMeta(categories.value, c.categoryId).name,
      currentEuros: c.current / 100,
      previousEuros: c.previous / 100,
      deltaPct: c.deltaPct,
    }))
    const result = await suggestFinanceInsight(props.couple.id, deltas, month.label)
    if (token !== insightToken) return

    if (result.kind === 'ok') {
      insightCache.value[month.monthKey] = { text: result.data, error: false, locked: false }
    } else {
      // 'premium' (Free-Tier) und 'quota' (Fair-Use bei Premium) landen beide
      // auf derselben Teaser-Karte.
      insightCache.value[month.monthKey] = { text: '', error: false, locked: true }
    }
  } catch (err) {
    console.error('Failed to load finance insight:', err)
    if (token === insightToken) insightCache.value[month.monthKey] = { text: '', error: true, locked: false }
  } finally {
    if (token === insightToken) insightLoading.value = false
  }
}

// Ausgaben laden asynchron per onSnapshot — sobald sie da sind bzw. der Monat
// wechselt, den passenden Insight (nach)laden.
watch(
  [() => props.loading, () => activeMonth.value?.monthKey],
  ([stillLoading]) => {
    if (stillLoading) return
    loadInsightFor(activeMonth.value)
  },
  { immediate: true }
)

const activeInsight = computed<InsightState | null>(() =>
  activeMonth.value ? insightCache.value[activeMonth.value.monthKey] ?? null : null
)
</script>

<template>
  <div class="coach-pane">
    <div v-if="props.loading" class="empty-msg">Laden…</div>

    <div v-else-if="months.length === 0" class="empty-msg">
      Noch keine Ausgaben erfasst — sobald ihr welche eintragt, entsteht hier eine Auswertung.
    </div>

    <template v-else>
      <!-- Monatsfilter -->
      <div class="month-row">
        <button
          v-for="m in months"
          :key="m.monthKey"
          class="month-chip"
          :class="{ 'month-chip--active': m.monthKey === activeMonth?.monthKey }"
          @click="selectedMonthKey = m.monthKey"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- AI-Insight -->
      <button
        v-if="activeInsight?.locked"
        type="button"
        class="insight-card insight-card--locked"
        @click="showPaywall('financeCoach')"
      >
        <span class="insight-icon">🔒</span>
        <span class="insight-locked-body">
          <span class="insight-text">Der Finanz-Coach erkennt, wo eure Ausgaben diesen Monat aus dem Rahmen fallen.</span>
          <span class="insight-cta">Mit Together Plus freischalten</span>
        </span>
      </button>
      <div v-else class="insight-card">
        <span class="insight-icon">✨</span>
        <p v-if="!activeInsight && insightLoading" class="insight-text insight-text--loading">Analysiere eure Ausgaben …</p>
        <p v-else-if="activeInsight?.error" class="insight-text">
          Insight konnte gerade nicht geladen werden — die Zahlen unten stimmen trotzdem.
        </p>
        <p v-else-if="activeInsight?.text" class="insight-text">{{ activeInsight.text }}</p>
        <p v-else class="insight-text">Noch nicht genug Daten für einen Bericht.</p>
      </div>

      <!-- Monatssumme -->
      <div class="total-card">
        <span class="total-label">Ausgaben im {{ activeMonth?.label }}</span>
        <span class="total-value mono">{{ formatEuros(animatedTotal) }}</span>
      </div>

      <!-- Kategorien -->
      <div class="section-label bars-label">Nach Kategorie</div>
      <div v-if="bars.length === 0" class="empty-msg">Keine Ausgaben in diesem Monat.</div>
      <div v-else class="bars-list">
        <div v-for="b in bars" :key="b.categoryId" class="bar-row">
          <div class="bar-head">
            <span class="bar-icon" :style="{ background: b.color }">{{ b.icon }}</span>
            <span class="bar-name">{{ b.name }}</span>
            <span class="bar-amount mono">{{ formatEuros(Math.round(b.current * anim)) }}</span>
            <span
              v-if="b.deltaPct !== null"
              class="bar-delta"
              :class="b.deltaPct > 0 ? 'bar-delta--up' : b.deltaPct < 0 ? 'bar-delta--down' : ''"
            >{{ b.deltaPct > 0 ? '+' : '' }}{{ b.deltaPct }}%</span>
            <span v-else class="bar-delta bar-delta--new">neu</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: (b.widthPct * anim) + '%', background: b.color }" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.coach-pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px var(--screen-pad) 32px;
}

/* ── Monatsfilter (Muster wie Haushalt-Verlauf) ──────────── */
.month-row {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
  overflow-x: auto;
}

.month-chip {
  padding: 7px 13px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: 10px;
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: var(--shadow-card);
  transition: all 0.15s ease;
  text-transform: capitalize;
}

.month-chip--active {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--text);
}

/* ── AI-Insight ──────────────────────────────────────────── */
.insight-card {
  display: flex;
  gap: 12px;
  background: var(--accent-tint);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-card-lg);
  padding: 18px;
  margin-bottom: 16px;
}

.insight-icon {
  flex-shrink: 0;
  font-size: 22px;
}

.insight-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.55;
  margin: 0;
}

.insight-text--loading {
  color: var(--text-secondary);
}

.insight-card--locked {
  width: 100%;
  text-align: left;
  align-items: center;
  cursor: pointer;
  font: inherit;
  transition: transform var(--dur-fast) var(--ease-out);
}

.insight-card--locked:active {
  transform: scale(0.98);
}

.insight-locked-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.insight-cta {
  font-size: 12px;
  font-weight: 800;
  color: var(--finanzen);
}

/* ── Monatssumme ─────────────────────────────────────────── */
.total-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 18px 20px;
  margin-bottom: 24px;
}

.total-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-meta);
  text-transform: capitalize;
}

.total-value {
  font-family: var(--font-headline);
  font-size: 30px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
}

/* ── Kategorie-Balken (größer + animiert) ────────────────── */
.bars-label {
  margin-bottom: 14px;
}

.empty-msg {
  padding: 32px var(--screen-pad);
  font-size: 13px;
  color: var(--text-faint);
  text-align: center;
  line-height: 1.5;
}

.bars-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bar-row {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.bar-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(60, 45, 30, 0.12);
}

.bar-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-amount {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  flex-shrink: 0;
}

.bar-delta {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  min-width: 42px;
  text-align: right;
  color: var(--text-meta);
}

.bar-delta--up {
  color: var(--danger);
}

.bar-delta--down {
  color: var(--success);
}

.bar-delta--new {
  color: var(--text-faint);
}

.bar-track {
  height: 14px;
  border-radius: 8px;
  background: var(--surface-deep);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 8px;
  /* Breite wird per JS animiert; leichte CSS-Transition für Datenupdates */
  transition: width 0.35s var(--ease-standard);
}
</style>

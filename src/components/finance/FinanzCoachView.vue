<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { CategoryMonthlyComparison, Couple } from '@/types'
import { resolveExpenseCategories, categoryMeta } from '@/utils/expenseCategories'
import { suggestFinanceInsight, type FinanceCategoryDelta } from '@/services/geminiFinance'

// Als Finanzen-Tab eingebettet statt eigener Route — bekommt die schon in
// FinanzenView laufenden Daten als Props statt eine zweite useExpenses-
// Instanz für dieselbe Seite zu starten.
const props = defineProps<{
  couple: Couple | null
  categoryMonthlyComparison: readonly CategoryMonthlyComparison[]
  loading: boolean
}>()

const router = useRouter()

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date())
)

const categories = computed(() => resolveExpenseCategories(props.couple))

function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

const bars = computed(() =>
  props.categoryMonthlyComparison.map((d) => {
    const meta = categoryMeta(categories.value, d.categoryId)
    const maxCents = Math.max(d.current, d.previous, 1)
    return {
      ...d,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,
      widthPct: Math.round((d.current / maxCents) * 100),
    }
  })
)

const insightText = ref('')
const insightLoading = ref(false)
const insightError = ref(false)

async function loadInsight() {
  if (props.categoryMonthlyComparison.length === 0) return
  insightLoading.value = true
  insightError.value = false
  try {
    const deltas: FinanceCategoryDelta[] = props.categoryMonthlyComparison.map((d) => ({
      name: categoryMeta(categories.value, d.categoryId).name,
      currentEuros: d.current / 100,
      previousEuros: d.previous / 100,
      deltaPct: d.deltaPct,
    }))
    insightText.value = await suggestFinanceInsight(deltas, monthLabel.value)
  } catch (err) {
    console.error('Failed to load finance insight:', err)
    insightError.value = true
  } finally {
    insightLoading.value = false
  }
}

// Ausgaben laden asynchron per onSnapshot — sobald sie da sind, einmalig den
// Insight abrufen (Guard verhindert Mehrfachaufruf bei späteren Änderungen).
let insightRequested = false
watch(() => props.loading, (stillLoading) => {
  if (stillLoading || insightRequested) return
  insightRequested = true
  loadInsight()
}, { immediate: true })

function goToEssensplan() {
  router.push('/einkaufen')
}
</script>

<template>
  <div class="coach-pane">
    <div class="insight-card">
      <span class="insight-icon">✨</span>
      <p v-if="insightLoading" class="insight-text insight-text--loading">Analysiere eure Ausgaben …</p>
      <p v-else-if="insightError" class="insight-text">
        Insight konnte gerade nicht geladen werden — die Zahlen unten stimmen trotzdem.
      </p>
      <p v-else-if="insightText" class="insight-text">{{ insightText }}</p>
      <p v-else class="insight-text">Noch nicht genug Daten für einen Bericht.</p>
    </div>

    <div class="section-label bars-label">Kategorien im Vergleich · {{ monthLabel }}</div>
    <div v-if="bars.length === 0" class="empty-msg">Noch keine Ausgaben in diesem oder letztem Monat.</div>
    <div v-else class="bars-list">
      <div v-for="b in bars" :key="b.categoryId" class="bar-row">
        <div class="bar-head">
          <span class="bar-icon" :style="{ background: b.color }">{{ b.icon }}</span>
          <span class="bar-name">{{ b.name }}</span>
          <span class="bar-amount mono">{{ formatEuros(b.current) }}</span>
          <span
            v-if="b.deltaPct !== null"
            class="bar-delta"
            :class="b.deltaPct > 0 ? 'bar-delta--up' : b.deltaPct < 0 ? 'bar-delta--down' : ''"
          >{{ b.deltaPct > 0 ? '+' : '' }}{{ b.deltaPct }}%</span>
          <span v-else class="bar-delta bar-delta--new">neu</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: b.widthPct + '%', background: b.color }" />
        </div>
      </div>
    </div>

    <div class="suggestion-card">
      <p class="suggestion-text">
        Wenn eine Kategorie diesen Monat stark gestiegen ist, hilft manchmal ein günstiges Rezept im Essensplan.
      </p>
      <button class="btn-primary suggestion-cta" type="button" @click="goToEssensplan">
        Günstiges Rezept vorschlagen lassen
      </button>
    </div>
  </div>
</template>

<style scoped>
.coach-pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px var(--screen-pad) 32px;
}

.insight-card {
  display: flex;
  gap: 12px;
  background: var(--accent-tint);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-card-lg);
  padding: 16px;
  margin-bottom: 20px;
}

.insight-icon {
  flex-shrink: 0;
  font-size: 20px;
}

.insight-text {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.5;
  margin: 0;
}

.insight-text--loading {
  color: var(--text-secondary);
}

.bars-label {
  margin-bottom: 10px;
}

.empty-msg {
  padding: 24px var(--screen-pad);
  font-size: 13px;
  color: var(--text-faint);
  text-align: center;
}

.bars-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bar-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.bar-name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-amount {
  font-size: 12.5px;
  color: var(--text);
  flex-shrink: 0;
}

.bar-delta {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  min-width: 38px;
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
  height: 8px;
  border-radius: 5px;
  background: var(--surface-deep);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s var(--ease-standard);
}

.suggestion-card {
  margin-top: 24px;
  background: var(--surface);
  border: 1px solid var(--border-softer);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-card);
  padding: 16px;
}

.suggestion-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 12px;
}

.suggestion-cta {
  margin: 0;
}
</style>

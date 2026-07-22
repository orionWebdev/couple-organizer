<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type {
  Couple,
  Expense,
  ExpenseBalanceSummary,
  FinanceEventSummary,
  FinanceMonthComparison,
  MonthlyExpenseSummary,
} from '@/types'
import { resolveExpenseCategories, categoryMeta } from '@/utils/expenseCategories'
import { coachInsight, type CoachAction, type CoachReport } from '@/services/ai'
import { buildMoneySnapshot } from '@/utils/coachSnapshot'
import { showPaywall } from '@/composables/usePaywall'
import AiButton from '@/components/ai/AiButton.vue'
import CoachReportCard from '@/components/ai/CoachReportCard.vue'
import { useAiThinking } from '@/composables/useAiThinking'

const { runTask, playBloom } = useAiThinking()

// Denk-Zustand lebt in der Ziel-Karte selbst (kein Overlay, kein Rand-Glow).
const thinking = ref(false)

// Als Finanzen-Tab eingebettet statt eigener Route — bekommt die schon in
// FinanzenView laufenden Daten als Props statt eine zweite useExpenses-
// Instanz für dieselbe Seite zu starten. Der Coach braucht mehr davon als die
// reinen Kategorie-Deltas: Budget, Paar-Split und offener Saldo sind genau das,
// was der frühere Ein-Satz-Insight nie zu sehen bekam.
const props = defineProps<{
  couple: Couple | null
  months: readonly FinanceMonthComparison[]
  monthlySummaries: readonly MonthlyExpenseSummary[]
  balanceInfo: ExpenseBalanceSummary
  events: readonly FinanceEventSummary[]
  expenses: readonly Expense[]
  loading: boolean
}>()

const emit = defineEmits<{ action: [action: CoachAction] }>()

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

// ── Coach pro Monat (Button-getriggert, danach gecacht) ───────
// Statt beim Öffnen automatisch zu laden, startet der Coach auf Tap des
// pill-AiButton — konsistent mit der KI-Identität der anderen Seiten. Ergebnis
// pro Monat gecacht.
interface CoachState { report: CoachReport | null; error: string | null }
const reportCache = ref<Record<string, CoachState>>({})

const activeReport = computed<CoachState | null>(() =>
  activeMonth.value ? reportCache.value[activeMonth.value.monthKey] ?? null : null
)

const canAnalyze = computed(() =>
  !!activeMonth.value && activeMonth.value.categories.length > 0
)

let runToken = 0
function cancelThinking() {
  runToken++
  thinking.value = false
}

// Kein Premium-Gate mehr im View: der Coach ist im Free-Tier 1×/Monat drin
// (AI_LIMITS.coachAi), und zählen kann das nur der Server. Lehnt er ab, kommt
// das als AiResult-Zweig zurück und öffnet hier die Paywall.
async function startInsight() {
  if (!canAnalyze.value || thinking.value) return
  const token = ++runToken
  thinking.value = true
  const res = await runTask(runInsight)
  if (token !== runToken) return // abgebrochen → Ergebnis verwerfen, nichts cachen
  // Kurzer Bloom vorm Reveal (nur bei echtem Ergebnis, nicht bei Paywall-Abbruch).
  if (res) await playBloom()
  if (token !== runToken) return
  thinking.value = false
  if (res) reportCache.value[res.monthKey] = res.state
}

// KI-Arbeit als task. Schreibt NICHT selbst in den Cache (sonst würde ein
// abgebrochener Aufruf die Karte doch noch füllen) — das macht startInsight
// nach der Token-Prüfung. null = Paywall (Quota/Premium).
async function runInsight(): Promise<{ monthKey: string; state: CoachState } | null> {
  const month = activeMonth.value
  if (!month || !props.couple) return null

  try {
    // mentalLoad fehlt hier absichtlich — die Money-Lens bekommt nur Finanzdaten,
    // Coach-Regel 1 deckt den Rest ab (siehe FairnessCard).
    const snapshot = buildMoneySnapshot({
      couple: props.couple,
      monthKey: month.monthKey,
      monthLabel: month.label,
      categories: categories.value,
      month,
      summary: props.monthlySummaries.find((m) => m.monthKey === month.monthKey) ?? null,
      balance: props.balanceInfo,
      expenses: props.expenses,
      events: props.events,
    })
    const result = await coachInsight(props.couple.id, 'money', snapshot)

    if (result.kind === 'ok') {
      return { monthKey: month.monthKey, state: { report: result.data, error: null } }
    }
    // Ein Ausfall der KI ist KEINE Paywall — sonst bekäme der Nutzer bei einem
    // Ratenlimit ein Kaufangebot statt der Auskunft "gleich nochmal probieren".
    if (result.kind === 'error') {
      return { monthKey: month.monthKey, state: { report: null, error: result.message } }
    }
    showPaywall('financeCoach')
    return null
  } catch (err) {
    console.error('Failed to load coach report:', err)
    return {
      monthKey: month.monthKey,
      state: { report: null, error: 'Die Auswertung konnte nicht geladen werden.' }
    }
  }
}
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

      <!-- KI-Coach Einstieg — Direkt-Auslöser: Denk-Zustand am Button (§6·A Halo) -->
      <div class="coach-head">
        <span class="coach-head-title">✨ Finanz-Coach</span>
        <AiButton
          variant="pill"
          icon="📊"
          title="Analysieren"
          :thinking="thinking"
          thinkingStatus="Analysiert eure Ausgaben …"
          @click="thinking ? cancelThinking() : startInsight()"
        />
      </div>

      <!-- Coach-Bericht (der Denk-Zustand sitzt am Button, nicht hier) -->
      <CoachReportCard
        v-if="activeReport?.report"
        :report="activeReport.report"
        class="coach-report"
        @action="emit('action', $event)"
      />
      <div v-else-if="activeReport?.error" class="insight-card">
        <span class="insight-icon">✨</span>
        <p class="insight-text">{{ activeReport.error }} Die Zahlen unten stimmen trotzdem.</p>
      </div>
      <div v-else class="insight-card insight-card--hint">
        <span class="insight-icon">✨</span>
        <p class="insight-text">Tippe „Analysieren" für eine Einschätzung zum {{ activeMonth?.label }} — Budget, Paar-Split und was zwischen euch offen steht.</p>
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

/* ── KI-Coach Kopf (pill-AiButton) ───────────────────────── */
.coach-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.coach-head-title {
  font-family: var(--font-headline);
  font-weight: 600;
  font-size: 16px;
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

.insight-card--hint .insight-text {
  color: var(--text-secondary);
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

.coach-report {
  margin-bottom: 16px;
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
  border: 2px solid var(--surface);
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

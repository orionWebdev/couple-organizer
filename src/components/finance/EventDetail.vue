<script setup lang="ts">
import { computed } from 'vue'
import type { Couple, Expense, FinanceEventSummary } from '@/types'
import ExpenseRow from './ExpenseRow.vue'

const props = defineProps<{
  summary: FinanceEventSummary
  couple: Couple | null
  currentUserId: string
}>()

const emit = defineEmits<{
  back: []
  addExpense: []
  deleteExpense: [id: string]
  editExpense: [expense: Expense]
  settle: []
  setBudget: []
}>()

const unpaidExpenses = computed(() => props.summary.expenses.filter((e) => !e.isPaid))

function euro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

const totalFormatted = computed(() => euro(props.summary.total))

// ── Optionales Event-Budget ───────────────────────────────────
// Bezugsgröße ist `spent` (alle Ausgaben des Events), nicht `total` — sonst
// fiele der Balken nach dem Ausgleichen auf 0 zurück, obwohl das Geld weg ist.
const budget = computed(() => props.summary.event.budget ?? null)
const hasBudget = computed(() => budget.value != null && budget.value > 0)

const budgetPct = computed(() =>
  hasBudget.value ? Math.min(100, Math.round((props.summary.spent / budget.value!) * 100)) : 0
)

const overBudget = computed(() => hasBudget.value && props.summary.spent > budget.value!)

const budgetLine = computed(() => {
  if (!hasBudget.value) return ''
  const rest = budget.value! - props.summary.spent
  return overBudget.value
    ? `${euro(-rest)} über Budget`
    : `noch ${euro(rest)}`
})

const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)

const personAName = computed(() => props.couple?.memberNames[personA.value ?? ''] ?? 'Person A')
const personBName = computed(() => props.couple?.memberNames[personB.value ?? ''] ?? 'Person B')

const diff = computed(() => {
  const a = props.summary.balances[personA.value ?? ''] ?? 0
  const b = props.summary.balances[personB.value ?? ''] ?? 0
  return a - b
})

const isSettled = computed(() => Math.abs(diff.value) < 1)

const settleLine = computed(() => {
  if (isSettled.value) return 'Ausgeglichen'
  if (diff.value < 0) return `${personBName.value} → ${personAName.value}`
  return `${personAName.value} → ${personBName.value}`
})

const settleAmountFormatted = computed(() => {
  const euros = Math.abs(diff.value) / 2 / 100
  return euros.toFixed(2).replace('.', ',') + ' €'
})
</script>

<template>
  <div class="event-detail">
    <div class="detail-header">
      <button class="back-caret" type="button" @click="emit('back')" aria-label="Zurück">‹</button>
    </div>

    <div class="balance-card">
      <div class="card-label section-label">{{ summary.event.title.toUpperCase() }}</div>
      <div class="card-amount mono">{{ totalFormatted }}</div>

      <template v-if="hasBudget">
        <div class="budget-bar">
          <div
            class="budget-fill"
            :class="{ 'budget-fill--over': overBudget }"
            :style="{ width: budgetPct + '%' }"
          />
        </div>
        <button class="budget-line" type="button" @click="emit('setBudget')">
          <span class="mono">{{ euro(summary.spent) }} / {{ euro(budget!) }}</span>
          <span :class="overBudget ? 'budget-over' : 'budget-rest'">· {{ budgetLine }}</span>
        </button>
      </template>

      <button v-else class="budget-chip" type="button" @click="emit('setBudget')">
        ＋ Budget für dieses Event
      </button>
    </div>

    <div v-if="summary.expenses.length === 0" class="empty-state">
      Noch keine Ausgaben in diesem Event.
      <button class="empty-cta" @click="emit('addExpense')">+ Erste Ausgabe hinzufügen</button>
    </div>
    <template v-else>
      <div class="expense-list">
        <ExpenseRow
          v-for="exp in unpaidExpenses"
          :key="exp.id"
          :expense="exp"
          :couple="couple"
          :currentUserId="currentUserId"
          @delete="emit('deleteExpense', $event)"
          @edit="emit('editExpense', $event)"
        />
      </div>

      <div v-if="!isSettled" class="settle-card">
        <div class="settle-row">
          <span class="settle-label">Beim Abschließen:</span>
          <span class="settle-value">{{ settleLine }}&nbsp;<span class="settle-amount mono">{{ settleAmountFormatted }}</span></span>
        </div>
        <button class="settle-btn" @click="emit('settle')">Abschließen &amp; Ausgleichen</button>
      </div>

      <button class="add-more-btn" @click="emit('addExpense')">+ Ausgabe hinzufügen</button>
    </template>
  </div>
</template>

<style scoped>
.event-detail {
  padding-bottom: 24px;
}

.detail-header {
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 8px;
}

.back-caret {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-faint);
  cursor: pointer;
}

.back-caret:active {
  color: var(--text);
}

.balance-card {
  background: var(--accent-tint);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 22px;
  padding: 18px;
  margin: 12px var(--screen-pad) 24px;
}

/* Optionales Event-Budget — bewusst zurückhaltend: Der Betrag oben bleibt die
   Hauptaussage, das Budget ist eine Zusatzinformation. */
.budget-bar {
  height: 8px;
  margin-top: 12px;
  border-radius: 5px;
  background: var(--surface);
  overflow: hidden;
}

.budget-fill {
  height: 100%;
  border-radius: 5px;
  background: var(--accent);
  transition: width 0.6s var(--ease-standard);
}

.budget-fill--over {
  background: var(--danger);
}

.budget-line {
  display: flex;
  gap: 5px;
  margin-top: 7px;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
}

.budget-rest {
  color: var(--text-meta);
}

.budget-over {
  color: var(--danger);
}

.budget-chip {
  margin-top: 12px;
  padding: 5px 11px;
  border: 1px dashed var(--accent);
  border-radius: 999px;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.card-label {
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.card-amount {
  font-size: 36px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
}

.empty-state {
  text-align: center;
  padding: 24px 20px 8px;
  color: var(--text-faint);
  font-size: 13.5px;
  line-height: 1.5;
  margin: 0 var(--screen-pad);
}

.empty-cta {
  display: block;
  width: 100%;
  margin-top: 14px;
  border: 1.5px dashed var(--border);
  cursor: pointer;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 13px;
  border-radius: 14px;
}

.expense-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 0 var(--screen-pad);
}

/* Nido: Ausgleich-Banner in voller Akzentfarbe */
.settle-card {
  margin: 22px var(--screen-pad) 0;
  border: none;
  border-radius: var(--radius-card);
  padding: 15px 16px;
  background: var(--accent);
  color: #fff;
}

.settle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settle-label {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.settle-value {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.settle-amount {
  color: #fff;
}

.settle-btn {
  margin-top: 14px;
  width: 100%;
  border: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 12px;
  border-radius: 12px;
}

.add-more-btn {
  display: block;
  width: calc(100% - 2 * var(--screen-pad));
  margin: 16px var(--screen-pad) 0;
  border: 1.5px dashed var(--border);
  cursor: pointer;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  padding: 13px;
  border-radius: 14px;
}
</style>

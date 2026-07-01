<script setup lang="ts">
import { computed } from 'vue'
import type { Couple, FinanceEventSummary } from '@/types'
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
  settle: []
}>()

const unpaidExpenses = computed(() => props.summary.expenses.filter((e) => !e.isPaid))

const totalFormatted = computed(() => {
  const euros = props.summary.total / 100
  return euros.toFixed(2).replace('.', ',') + ' €'
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
      <button class="back-btn" @click="emit('back')">← Zurück</button>
    </div>

    <div class="balance-card">
      <div class="card-label section-label">{{ summary.event.title.toUpperCase() }}</div>
      <div class="card-amount mono">{{ totalFormatted }}</div>
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

.back-btn {
  background: none;
  border: none;
  color: var(--text-meta);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
}

.balance-card {
  background: linear-gradient(150deg, #2c3833 0%, #23201b 58%);
  border: 1px solid #38423d;
  border-radius: 22px;
  padding: 22px;
  margin: 12px var(--screen-pad) 24px;
}

.card-label {
  color: var(--text-faint);
  margin-bottom: 12px;
  letter-spacing: 0.14em;
}

.card-amount {
  font-size: 42px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
  text-align: center;
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
  border: 1px dashed #3d362e;
  cursor: pointer;
  background: transparent;
  color: var(--accent);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 13px;
  border-radius: 13px;
}

.expense-list {
  border-top: 1px solid var(--border-softer);
}

.settle-card {
  margin: 22px var(--screen-pad) 0;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: var(--surface);
}

.settle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settle-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.settle-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.settle-amount {
  color: var(--accent);
}

.settle-btn {
  margin-top: 14px;
  width: 100%;
  border: none;
  cursor: pointer;
  background: var(--accent);
  color: #14110d;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14.5px;
  font-weight: 600;
  padding: 13px;
  border-radius: 13px;
}

.add-more-btn {
  display: block;
  width: calc(100% - 2 * var(--screen-pad));
  margin: 16px var(--screen-pad) 0;
  border: 1px dashed #3d362e;
  cursor: pointer;
  background: transparent;
  color: var(--accent);
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 13px;
  border-radius: 13px;
}
</style>

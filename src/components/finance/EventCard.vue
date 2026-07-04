<script setup lang="ts">
import { computed } from 'vue'
import type { Couple, FinanceEventSummary } from '@/types'

const props = defineProps<{
  summary: FinanceEventSummary
  couple: Couple | null
}>()

const emit = defineEmits<{ click: [] }>()

const totalFormatted = computed(() => {
  const euros = props.summary.total / 100
  return euros.toFixed(2).replace('.', ',') + ' €'
})

const personA = computed(() => props.couple?.memberIds[0] ?? null)
const personB = computed(() => props.couple?.memberIds[1] ?? null)

const paidTotals = computed(() => {
  const totals: Record<string, number> = {}
  for (const exp of props.summary.expenses) {
    totals[exp.paidBy] = (totals[exp.paidBy] ?? 0) + exp.amount
  }
  return totals
})

const chrisW = computed(() => {
  const a = paidTotals.value[personA.value ?? ''] ?? 0
  const b = paidTotals.value[personB.value ?? ''] ?? 0
  const sum = a + b
  return sum === 0 ? 50 : Math.round(a / sum * 100)
})
const sarahW = computed(() => 100 - chrisW.value)

const itemCount = computed(() => props.summary.expenses.length)
</script>

<template>
  <button class="card" @click="emit('click')">
    <div class="card-name">{{ summary.event.title }}</div>
    <div class="card-total mono">{{ totalFormatted }}</div>
    <div class="card-bar">
      <div class="card-bar-chris" :style="{ width: chrisW + '%' }" />
      <div class="card-bar-sarah" :style="{ width: sarahW + '%' }" />
    </div>
    <div class="card-meta">{{ itemCount }} {{ itemCount === 1 ? 'Ausgabe' : 'Ausgaben' }}</div>
  </button>
</template>

<style scoped>
.card {
  flex: 0 0 168px;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-body);
  border: 1px solid var(--border-softer);
  background: var(--surface);
  border-radius: var(--radius-card);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--shadow-card);
}

.card-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.card-total {
  font-size: 18px;
  color: var(--text);
}

.card-bar {
  height: 6px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  background: var(--surface-deep);
}

.card-bar-chris { background: var(--chris); }
.card-bar-sarah { background: var(--sarah); }

.card-meta {
  font-size: 11.5px;
  color: var(--text-meta);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import type { Couple } from '@/types'

const props = defineProps<{
  balances: Record<string, number>
  totalSpent: number
  couple: Couple | null
}>()

// Find who owes whom
const summary = computed(() => {
  if (!props.couple || Object.keys(props.balances).length === 0) return null

  const entries = Object.entries(props.balances)
  // Person with positive balance is owed money
  const creditor = entries.find(([_, b]) => b > 0)
  const debtor = entries.find(([_, b]) => b < 0)

  if (!creditor || !debtor) return null

  const amount = Math.abs(debtor[1])
  return {
    debtorName: props.couple.memberNames[debtor[0]] || 'Unbekannt',
    creditorName: props.couple.memberNames[creditor[0]] || 'Unbekannt',
    amount
  }
})

function formatEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
</script>

<template>
  <div class="bg-slate-800 rounded-2xl border border-slate-700 p-4">
    <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide mb-2">Bilanz</h3>

    <div v-if="totalSpent === 0" class="text-slate-500 text-sm">
      Noch keine Ausgaben
    </div>

    <div v-else-if="summary && summary.amount > 0" class="text-center">
      <p class="text-lg text-slate-300">
        <span class="font-semibold text-red-400">{{ summary.debtorName }}</span>
        schuldet
        <span class="font-semibold text-green-400">{{ summary.creditorName }}</span>
      </p>
      <p class="text-3xl font-bold text-green-400 mt-1">
        {{ formatEuro(summary.amount) }} €
      </p>
    </div>

    <div v-else class="text-center">
      <p class="text-green-400 font-medium">Alles ausgeglichen!</p>
    </div>

    <p class="text-xs text-slate-500 mt-3 text-center">
      Gesamt ausgegeben: {{ formatEuro(totalSpent) }} €
    </p>
  </div>
</template>

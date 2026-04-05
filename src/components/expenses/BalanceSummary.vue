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
    debtorName: props.couple.memberNames[debtor[0]] || 'Unknown',
    creditorName: props.couple.memberNames[creditor[0]] || 'Unknown',
    amount
  }
})

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-4">
    <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Balance</h3>

    <div v-if="totalSpent === 0" class="text-gray-400 text-sm">
      No expenses yet
    </div>

    <div v-else-if="summary && summary.amount > 0" class="text-center">
      <p class="text-lg">
        <span class="font-semibold text-red-500">{{ summary.debtorName }}</span>
        owes
        <span class="font-semibold text-green-600">{{ summary.creditorName }}</span>
      </p>
      <p class="text-3xl font-bold text-indigo-600 mt-1">
        ${{ formatCents(summary.amount) }}
      </p>
    </div>

    <div v-else class="text-center">
      <p class="text-green-600 font-medium">All settled up!</p>
    </div>

    <p class="text-xs text-gray-400 mt-3 text-center">
      Total spent: ${{ formatCents(totalSpent) }}
    </p>
  </div>
</template>

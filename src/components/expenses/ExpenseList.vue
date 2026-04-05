<script setup lang="ts">
import { computed } from 'vue'
import { useExpenses } from '@/composables/useExpenses'
import type { Couple } from '@/types'
import BalanceSummary from './BalanceSummary.vue'
import ExpenseForm from './ExpenseForm.vue'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const { expenses, loading, error, balanceInfo, addExpense, deleteExpense } = useExpenses(coupleIdRef)

function formatEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function getMemberName(uid: string): string {
  return props.couple?.memberNames[uid] || 'Unbekannt'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Balance Summary -->
    <BalanceSummary
      :balances="balanceInfo.balances"
      :total-spent="balanceInfo.totalSpent"
      :couple="couple"
    />

    <!-- Add Expense Form -->
    <ExpenseForm
      :couple="couple"
      @add="addExpense"
    />

    <!-- Error -->
    <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>

    <!-- Expense list -->
    <div>
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide mb-2">Letzte Ausgaben</h3>

      <p v-if="loading" class="text-center text-slate-500 text-sm py-4">Laden...</p>

      <div v-else-if="expenses.length === 0" class="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-slate-500 text-sm">Noch keine Ausgaben</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="expense in expenses"
          :key="expense.id"
          class="flex items-center gap-3 p-4 bg-slate-800 rounded-2xl border border-slate-700"
        >
          <div class="flex-1">
            <p class="text-sm font-medium text-slate-100">{{ expense.title }}</p>
            <p class="text-xs text-slate-500">Bezahlt von {{ getMemberName(expense.paidBy) }}</p>
          </div>
          <span class="text-sm font-semibold text-slate-200">{{ formatEuro(expense.amount) }} €</span>
          <button
            @click="deleteExpense(expense.id)"
            class="text-slate-600 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

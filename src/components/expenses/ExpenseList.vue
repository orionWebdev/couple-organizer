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

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

function getMemberName(uid: string): string {
  return props.couple?.memberNames[uid] || 'Unknown'
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
    <p v-if="error" class="text-center text-red-500 text-sm py-2">{{ error }}</p>

    <!-- Expense list -->
    <div>
      <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Recent Expenses</h3>

      <p v-if="loading" class="text-center text-gray-400 text-sm py-4">Loading...</p>

      <p v-else-if="expenses.length === 0" class="text-center text-gray-400 text-sm py-4">
        No expenses yet
      </p>

      <div v-else class="space-y-2">
        <div
          v-for="expense in expenses"
          :key="expense.id"
          class="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm"
        >
          <div class="flex-1">
            <p class="text-sm font-medium">{{ expense.title }}</p>
            <p class="text-xs text-gray-400">Paid by {{ getMemberName(expense.paidBy) }}</p>
          </div>
          <span class="text-sm font-semibold text-gray-700">${{ formatCents(expense.amount) }}</span>
          <button
            @click="deleteExpense(expense.id)"
            class="text-gray-300 hover:text-red-500 transition-colors"
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

<script setup lang="ts">
import OverviewSectionCard from '@/components/overview/OverviewSectionCard.vue'
import BalanceSummary from './BalanceSummary.vue'
import ExpenseTimelineItem from './ExpenseTimelineItem.vue'
import type { Couple, Expense, ExpenseBalanceSummary, ExpenseCategory } from '@/types'

const props = defineProps<{
  couple: Couple | null
  currentUserId?: string | null
  balanceInfo: ExpenseBalanceSummary
  recentExpenses: ReadonlyArray<Readonly<Expense>>
}>()

const emit = defineEmits<{
  edit: [expense: Readonly<Expense>]
}>()

const categoryLabels: Record<ExpenseCategory, string> = {
  food: 'Lebensmittel',
  transport: 'Transport',
  home: 'Wohnen',
  leisure: 'Freizeit',
  other: 'Sonstiges'
}

function getMemberName(uid: string): string {
  return props.couple?.memberNames[uid] || 'Unbekannt'
}

function getCategoryLabel(category: ExpenseCategory): string {
  return categoryLabels[category] || 'Sonstiges'
}
</script>

<template>
  <div class="space-y-5">
    <BalanceSummary
      :balances="balanceInfo.balances"
      :totals="balanceInfo.totals"
      :total-spent="balanceInfo.totalSpent"
      :couple="couple"
      :current-user-id="currentUserId"
    />

    <OverviewSectionCard title="Letzte Ausgaben">
      <div v-if="recentExpenses.length === 0" class="py-3 text-sm text-slate-400">
        Noch keine Ausgaben vorhanden.
      </div>

      <div v-else class="space-y-4">
        <ExpenseTimelineItem
          v-for="expense in recentExpenses"
          :key="expense.id"
          :expense="expense"
          :payer-name="getMemberName(expense.paidBy)"
          :category-label="getCategoryLabel(expense.category)"
          :show-edit-action="true"
          @edit="emit('edit', $event)"
        />
      </div>
    </OverviewSectionCard>
  </div>
</template>

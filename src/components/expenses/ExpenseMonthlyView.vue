<script setup lang="ts">
import { computed } from 'vue'
import OverviewSectionCard from '@/components/overview/OverviewSectionCard.vue'
import ExpenseTimelineItem from './ExpenseTimelineItem.vue'
import type { Couple, Expense, ExpenseCategory, MonthlyExpenseSummary } from '@/types'

const props = defineProps<{
  couple: Couple | null
  months: ReadonlyArray<MonthlyExpenseSummary>
}>()

const emit = defineEmits<{
  edit: [expense: Readonly<Expense>]
}>()

const memberCount = computed(() => {
  const count = Object.keys(props.couple?.memberNames || {}).length
  return Math.max(count, 2)
})

const categoryLabels: Record<ExpenseCategory, string> = {
  food: 'Lebensmittel',
  transport: 'Transport',
  home: 'Wohnen',
  leisure: 'Freizeit',
  other: 'Sonstiges'
}

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function getMemberName(uid: string): string {
  return props.couple?.memberNames[uid] || 'Unbekannt'
}

function getCategoryLabel(category: ExpenseCategory): string {
  return categoryLabels[category] || 'Sonstiges'
}

function getBalanceText(balances: Record<string, number>): string {
  const creditor = Object.entries(balances).find(([_, amount]) => amount > 0)
  const debtor = Object.entries(balances).find(([_, amount]) => amount < 0)

  if (!creditor || !debtor) return 'Alles ausgeglichen'

  return `${getMemberName(debtor[0])} schuldet ${formatEuro(Math.abs(debtor[1]))}`
}
</script>

<template>
  <OverviewSectionCard title="Monatliche Ausgaben">
    <div v-if="months.length === 0" class="py-3 text-sm text-slate-400">
      Noch keine monatlichen Ausgaben vorhanden.
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="month in months"
        :key="month.monthKey"
        class="rounded-[1.35rem] border border-slate-700/80 bg-slate-900/35 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-slate-100">{{ formatMonth(month.monthKey) }}</h3>
            <p class="mt-1 text-sm text-slate-400">
              Gesamt {{ formatEuro(month.total) }} · pro Person {{ formatEuro(Math.round(month.total / memberCount)) }}
            </p>
            <p class="mt-2 text-sm font-medium text-emerald-300">{{ getBalanceText(month.balances) }}</p>
          </div>
          <span class="rounded-full border border-slate-700/80 bg-slate-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Monthly
          </span>
        </div>

        <div v-if="month.expenses.length === 0" class="pt-4 text-sm text-slate-500">
          Für diesen Monat gibt es noch keine Ausgaben.
        </div>

        <div v-else class="mt-4 space-y-4">
          <ExpenseTimelineItem
            v-for="expense in month.expenses"
            :key="expense.id"
            :expense="expense"
            :payer-name="getMemberName(expense.paidBy)"
            :category-label="getCategoryLabel(expense.category)"
            :show-edit-action="true"
            @edit="emit('edit', $event)"
          />
        </div>
      </article>
    </div>
  </OverviewSectionCard>
</template>

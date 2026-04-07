<script setup lang="ts">
import { computed } from 'vue'
import OverviewSectionCard from '@/components/overview/OverviewSectionCard.vue'
import ExpenseTimelineItem from './ExpenseTimelineItem.vue'
import type { Couple, Expense, ExpenseCategory, FinanceEventSummary } from '@/types'

const props = defineProps<{
  couple: Couple | null
  events: ReadonlyArray<FinanceEventSummary>
}>()

const emit = defineEmits<{
  edit: [expense: Readonly<Expense>]
  archive: [eventId: string]
  openArchive: []
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
  <div class="space-y-5">
    <OverviewSectionCard
      title="Events"
      action-label="Archiv"
      @action="emit('openArchive')"
    >
      <div v-if="events.length === 0" class="py-3 text-sm text-slate-400">
        Noch keine Events angelegt.
      </div>

      <div v-else class="space-y-4">
        <article
          v-for="entry in events"
          :key="entry.event.id"
          class="rounded-[1.35rem] border border-slate-700/80 bg-slate-900/35 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-slate-100">{{ entry.event.title }}</h3>
              <p class="mt-1 text-sm text-slate-400">
                Gesamt {{ formatEuro(entry.total) }} · pro Person {{ formatEuro(Math.round(entry.total / memberCount)) }}
              </p>
              <p class="mt-2 text-sm font-medium text-emerald-300">{{ getBalanceText(entry.balances) }}</p>
            </div>
            <button
              type="button"
              class="event-archive-button"
              @click="emit('archive', entry.event.id)"
            >
              Archivieren
            </button>
          </div>

          <div v-if="entry.expenses.length === 0" class="pt-4 text-sm text-slate-500">
            Für dieses Event gibt es noch keine Ausgaben.
          </div>

          <div v-else class="mt-4 space-y-4">
            <ExpenseTimelineItem
              v-for="expense in entry.expenses"
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
  </div>
</template>

<style scoped>
.event-archive-button {
  border: 0;
  border-radius: 9999px;
  padding: 0.55rem 0.9rem;
  background: rgba(51, 65, 85, 0.72);
  color: rgb(226 232 240);
  font-size: 0.85rem;
  font-weight: 600;
}
</style>

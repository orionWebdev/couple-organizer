<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import { useExpenses } from '@/composables/useExpenses'
import type { Couple, Expense, ExpenseCategory, FinanceEventKind } from '@/types'
import BalanceSummary from './BalanceSummary.vue'
import ExpenseTimelineItem from './ExpenseTimelineItem.vue'
import OverviewSectionCard from '@/components/overview/OverviewSectionCard.vue'

interface TimelineGroup {
  key: string
  label: string
  expenses: ReadonlyArray<Readonly<Expense>>
}

const props = defineProps<{
  coupleId: string
  couple: Couple | null
}>()

const { user } = useAuth()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const {
  expenses,
  loading,
  error,
  balanceInfo,
  eventSummaries,
  recurringEventSummaries,
  addExpense,
  createEvent,
  setEventArchived,
  setEventSettled,
  setMonthlyEventMonthSettled
} = useExpenses(coupleIdRef)

const newExpenseTitle = ref('')
const newExpenseAmount = ref('')
const newExpenseCategory = ref<ExpenseCategory>('food')
const newExpensePaidBy = ref(user.value?.uid || '')
const newExpenseEventId = ref('')

const newEventTitle = ref('')
const newEventKind = ref<FinanceEventKind>('one_time')
const newEventCategory = ref<ExpenseCategory>('food')

const showAddExpenseModal = ref(false)
const showEventModal = ref(false)

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'food', label: 'Lebensmittel' },
  { value: 'transport', label: 'Transport' },
  { value: 'home', label: 'Wohnen' },
  { value: 'leisure', label: 'Freizeit' },
  { value: 'other', label: 'Sonstiges' }
]

watch(() => props.couple, (couple) => {
  if (!couple) return
  const fallback = user.value?.uid || Object.keys(couple.memberNames)[0] || ''
  if (!newExpensePaidBy.value || !(newExpensePaidBy.value in couple.memberNames)) {
    newExpensePaidBy.value = fallback
  }
}, { immediate: true })

const activeOneTimeEvents = computed(() => eventSummaries.value.filter((entry) => !entry.event.archived))
const archivedOneTimeEvents = computed(() => eventSummaries.value.filter((entry) => entry.event.archived))
const activeRecurringEvents = computed(() => recurringEventSummaries.value.filter((entry) => !entry.event.archived))
const archivedRecurringEvents = computed(() => recurringEventSummaries.value.filter((entry) => entry.event.archived))

const selectableEvents = computed(() => {
  return [
    ...activeOneTimeEvents.value.map((entry) => entry.event),
    ...activeRecurringEvents.value.map((entry) => entry.event)
  ]
})

const timelineGroups = computed<TimelineGroup[]>(() => {
  const groups = new Map<string, Expense[]>()

  for (const expense of expenses.value) {
    const bucket = getTimelineBucket(expense)
    groups.set(bucket.key, [...(groups.get(bucket.key) || []), expense])
  }

  return [...groups.entries()].map(([key, value]) => ({
    key,
    label: getTimelineLabel(key),
    expenses: value
  }))
})

function getTimelineBucket(expense: Readonly<Expense>): { key: string } {
  const now = new Date()
  const target = toDate(expense.createdAt)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diffDays = Math.floor((startOfToday - startOfTarget) / 86400000)

  if (diffDays <= 0) return { key: 'today' }
  if (diffDays === 1) return { key: 'yesterday' }
  return { key: `date:${target.getFullYear()}-${target.getMonth()}-${target.getDate()}` }
}

function getTimelineLabel(key: string): string {
  if (key === 'today') return 'Heute'
  if (key === 'yesterday') return 'Gestern'
  const raw = key.replace('date:', '')
  const [year, monthIndex, day] = raw.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(new Date(year, monthIndex, day))
}

function toDate(timestamp: unknown): Date {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
    return (timestamp as { toDate: () => Date }).toDate()
  }
  return new Date()
}

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`
}

function getMemberName(uid: string): string {
  return props.couple?.memberNames[uid] || 'Unbekannt'
}

function getCategoryLabel(category: ExpenseCategory): string {
  return categoryOptions.find((option) => option.value === category)?.label || 'Sonstiges'
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

async function handleAddExpense() {
  const title = newExpenseTitle.value.trim()
  const amount = Number(String(newExpenseAmount.value).replace(',', '.'))
  if (!title || !Number.isFinite(amount) || amount <= 0 || !newExpensePaidBy.value) return

  const expenseId = await addExpense({
    title,
    amountInCents: Math.round(amount * 100),
    paidBy: newExpensePaidBy.value,
    category: newExpenseCategory.value,
    eventId: newExpenseEventId.value || null
  })

  if (!expenseId) return

  newExpenseTitle.value = ''
  newExpenseAmount.value = ''
  newExpenseEventId.value = ''
  showAddExpenseModal.value = false
}

async function handleCreateEvent() {
  const title = newEventTitle.value.trim()
  if (!title) return

  await createEvent(title, {
    kind: newEventKind.value,
    category: newEventKind.value === 'monthly' ? newEventCategory.value : null
  })

  newEventTitle.value = ''
  newEventKind.value = 'one_time'
  newEventCategory.value = 'food'
  showEventModal.value = false
}
</script>

<template>
  <section class="space-y-5 pb-4">
    <div class="finance-page-header">
      <h1 class="text-[2rem] font-semibold tracking-tight text-slate-50">Finanzen</h1>
      <button type="button" class="finance-icon-button" aria-label="Event erstellen" @click="showEventModal = true">
        <ion-icon :icon="addOutline" class="text-xl" />
      </button>
    </div>

    <BalanceSummary
      :balances="balanceInfo.balances"
      :totals="balanceInfo.totals"
      :total-spent="balanceInfo.totalSpent"
      :couple="couple"
    />

    <div v-if="error" class="text-center text-sm text-red-400">{{ error }}</div>
    <div v-if="loading" class="flex justify-center py-12">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <template v-else>
      <div
        v-for="group in timelineGroups"
        :key="group.key"
        class="space-y-3"
      >
        <p class="px-1 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {{ group.label }}
        </p>
        <OverviewSectionCard title="" class="finance-section-compact">
          <div class="space-y-5">
            <ExpenseTimelineItem
              v-for="expense in group.expenses"
              :key="expense.id"
              :expense="expense"
              :payer-name="getMemberName(expense.paidBy)"
              :category-label="getCategoryLabel(expense.category)"
            />
          </div>
        </OverviewSectionCard>
      </div>

      <OverviewSectionCard title="Dauer-Events">
        <div v-if="activeRecurringEvents.length === 0" class="py-3 text-sm text-slate-400">
          Noch keine Dauer-Events angelegt.
        </div>
        <div v-else class="space-y-4">
          <article
            v-for="summary in activeRecurringEvents"
            :key="summary.event.id"
            class="rounded-[1.35rem] border border-slate-700/80 bg-slate-900/35 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-slate-100">{{ summary.event.title }}</h3>
                <p class="mt-1 text-sm text-slate-400">
                  Offener Betrag: {{ formatEuro(summary.unsettledTotal / 2) }} pro Person
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="finance-chip-button"
                  @click="setEventArchived(summary.event.id, true)"
                >
                  Archivieren
                </button>
              </div>
            </div>

            <div v-if="summary.entries.length === 0" class="pt-4 text-sm text-slate-500">
              Für dieses Dauer-Event gibt es noch keine Monatsabrechnung.
            </div>

            <div v-else class="mt-4 space-y-3">
              <div
                v-for="entry in summary.entries"
                :key="`${summary.event.id}-${entry.monthKey}`"
                class="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/30 px-4 py-3"
              >
                <div>
                  <p class="text-base font-medium text-slate-100">{{ formatMonth(entry.monthKey) }}</p>
                  <p class="mt-1 text-sm text-slate-400">
                    Gesamt {{ formatEuro(entry.total) }} · pro Person {{ formatEuro(entry.perPerson) }}
                  </p>
                </div>
                <button
                  type="button"
                  class="finance-status-button"
                  :class="{ 'finance-status-button-active': entry.settled }"
                  @click="setMonthlyEventMonthSettled(summary.event.id, entry.monthKey, !entry.settled)"
                >
                  {{ entry.settled ? 'Ausgeglichen' : 'Offen' }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </OverviewSectionCard>

      <OverviewSectionCard title="Finanz-Events">
        <div v-if="activeOneTimeEvents.length === 0" class="py-3 text-sm text-slate-400">
          Noch keine aktiven Finanz-Events.
        </div>
        <div v-else class="space-y-4">
          <article
            v-for="summary in activeOneTimeEvents"
            :key="summary.event.id"
            class="rounded-[1.35rem] border border-slate-700/80 bg-slate-900/35 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-slate-100">{{ summary.event.title }}</h3>
                <p class="mt-1 text-sm text-slate-400">
                  Gesamt {{ formatEuro(summary.total) }} · pro Person {{ formatEuro(summary.perPerson) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-2">
                <button
                  type="button"
                  class="finance-status-button"
                  :class="{ 'finance-status-button-active': summary.settled }"
                  @click="setEventSettled(summary.event.id, !summary.settled)"
                >
                  {{ summary.settled ? 'Ausgeglichen' : 'Als ausgeglichen markieren' }}
                </button>
                <button
                  type="button"
                  class="finance-chip-button"
                  @click="setEventArchived(summary.event.id, true)"
                >
                  Archivieren
                </button>
              </div>
            </div>

            <div v-if="summary.expenses.length === 0" class="pt-4 text-sm text-slate-500">
              Für dieses Event gibt es noch keine Ausgaben.
            </div>

            <div v-else class="mt-4 space-y-4">
              <ExpenseTimelineItem
                v-for="expense in summary.expenses"
                :key="expense.id"
                :expense="expense"
                :payer-name="getMemberName(expense.paidBy)"
                :category-label="getCategoryLabel(expense.category)"
              />
            </div>
          </article>
        </div>
      </OverviewSectionCard>

      <OverviewSectionCard title="Archiv">
        <div v-if="archivedOneTimeEvents.length === 0 && archivedRecurringEvents.length === 0" class="py-3 text-sm text-slate-400">
          Noch keine archivierten Finanz-Events.
        </div>
        <div v-else class="space-y-3">
          <article
            v-for="summary in [...archivedRecurringEvents, ...archivedOneTimeEvents]"
            :key="summary.event.id"
            class="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/30 px-4 py-3"
          >
            <div>
              <p class="text-base font-medium text-slate-100">{{ summary.event.title }}</p>
              <p class="mt-1 text-sm text-slate-400">
                {{ summary.event.kind === 'monthly' ? 'Dauer-Event' : 'Kurz-Event' }}
              </p>
            </div>
            <button
              type="button"
              class="finance-chip-button"
              @click="setEventArchived(summary.event.id, false)"
            >
              Reaktivieren
            </button>
          </article>
        </div>
      </OverviewSectionCard>
    </template>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="mb-2 mr-2">
      <ion-fab-button @click="showAddExpenseModal = true" color="primary">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>

    <ion-modal
      :is-open="showAddExpenseModal"
      :breakpoints="[0, 0.62]"
      :initial-breakpoint="0.62"
      @did-dismiss="showAddExpenseModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Ausgabe hinzufügen</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showAddExpenseModal = false">Fertig</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="space-y-4">
          <ion-input
            v-model="newExpenseTitle"
            placeholder="Wofür war die Ausgabe?"
            fill="outline"
            label="Titel"
            label-placement="floating"
            :clear-input="true"
          />
          <ion-input
            v-model="newExpenseAmount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            fill="outline"
            label="Betrag (€)"
            label-placement="floating"
          />
          <ion-select
            v-model="newExpenseCategory"
            label="Kategorie"
            label-placement="floating"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </ion-select-option>
          </ion-select>
          <ion-select
            v-model="newExpensePaidBy"
            label="Bezahlt von"
            label-placement="floating"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option v-for="(name, uid) in couple?.memberNames || {}" :key="uid" :value="uid">
              {{ name }}
            </ion-select-option>
          </ion-select>
          <ion-select
            v-model="newExpenseEventId"
            label="Event (optional)"
            label-placement="floating"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option value="">Kein Event</ion-select-option>
            <ion-select-option v-for="event in selectableEvents" :key="event.id" :value="event.id">
              {{ event.title }}
            </ion-select-option>
          </ion-select>
          <ion-button expand="block" @click="handleAddExpense">
            Speichern
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>

    <ion-modal
      :is-open="showEventModal"
      :breakpoints="[0, 0.52]"
      :initial-breakpoint="0.52"
      @did-dismiss="showEventModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Neues Finanz-Event</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showEventModal = false">Schließen</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="space-y-4">
          <ion-input
            v-model="newEventTitle"
            placeholder="z. B. Urlaub oder Konzert"
            fill="outline"
            label="Titel"
            label-placement="floating"
          />
          <ion-select
            v-model="newEventKind"
            label="Typ"
            label-placement="floating"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option value="one_time">Kurz-Event</ion-select-option>
            <ion-select-option value="monthly">Dauer-Event</ion-select-option>
          </ion-select>
          <ion-select
            v-if="newEventKind === 'monthly'"
            v-model="newEventCategory"
            label="Kategorie für Monatsabrechnung"
            label-placement="floating"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </ion-select-option>
          </ion-select>
          <ion-button expand="block" :disabled="!newEventTitle.trim()" @click="handleCreateEvent">
            Event anlegen
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </section>
</template>

<style scoped>
.finance-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.25rem;
}

.finance-icon-button {
  display: inline-flex;
  height: 3.25rem;
  width: 3.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(71, 85, 105, 0.55);
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  color: rgb(226 232 240);
  box-shadow: 0 14px 28px rgba(2, 6, 23, 0.16);
}

.finance-status-button,
.finance-chip-button {
  border: 0;
  border-radius: 9999px;
  padding: 0.55rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 150ms ease, color 150ms ease;
}

.finance-status-button {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(134 239 172);
}

.finance-status-button-active {
  background: rgba(71, 85, 105, 0.72);
  color: rgb(241 245 249);
}

.finance-chip-button {
  background: rgba(51, 65, 85, 0.72);
  color: rgb(226 232 240);
}

.finance-section-compact :deep(.px-5) {
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.finance-section-compact :deep(.py-4) {
  padding-top: 1.1rem;
  padding-bottom: 1.1rem;
}
</style>

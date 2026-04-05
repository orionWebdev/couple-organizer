<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useExpenses } from '@/composables/useExpenses'
import type { Couple, ExpenseCategory } from '@/types'
import BalanceSummary from './BalanceSummary.vue'

interface EventExpenseFormState {
  title: string
  amount: string
  category: ExpenseCategory
  paidBy: string
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
  monthlyFoodSummaries,
  eventSummaries,
  addExpense,
  deleteExpense,
  createEvent,
  setEventArchived
} = useExpenses(coupleIdRef)

const newExpenseTitle = ref('')
const newExpenseAmount = ref('')
const newExpenseCategory = ref<ExpenseCategory>('food')
const newExpensePaidBy = ref(user.value?.uid || '')
const newEventTitle = ref('')
const eventForms = reactive<Record<string, EventExpenseFormState>>({})

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'food', label: 'Lebensmittel' },
  { value: 'transport', label: 'Transport' },
  { value: 'home', label: 'Wohnen' },
  { value: 'leisure', label: 'Freizeit' },
  { value: 'other', label: 'Sonstiges' }
]

const monthFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric'
})

const activeEventSummaries = computed(() => eventSummaries.value.filter((entry) => !entry.event.archived))
const archivedEventSummaries = computed(() => eventSummaries.value.filter((entry) => entry.event.archived))

watch(() => props.couple, (couple) => {
  if (!couple) return
  const fallback = user.value?.uid || Object.keys(couple.memberNames)[0] || ''
  if (!newExpensePaidBy.value || !(newExpensePaidBy.value in couple.memberNames)) {
    newExpensePaidBy.value = fallback
  }
}, { immediate: true })

watch(activeEventSummaries, (summaries) => {
  const defaultPayer = newExpensePaidBy.value
  for (const summary of summaries) {
    if (!eventForms[summary.event.id]) {
      eventForms[summary.event.id] = {
        title: '',
        amount: '',
        category: 'other',
        paidBy: defaultPayer
      }
    }
  }
}, { immediate: true })

function formatEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  return monthFormatter.format(new Date(year, month - 1, 1))
}

function getMemberName(uid: string): string {
  return props.couple?.memberNames[uid] || 'Unbekannt'
}

async function handleAddExpense() {
  const title = newExpenseTitle.value.trim()
  const amount = Number(String(newExpenseAmount.value).replace(',', '.'))
  if (!title) return
  if (!Number.isFinite(amount) || amount <= 0) return
  if (!newExpensePaidBy.value) return

  const expenseId = await addExpense({
    title,
    amountInCents: Math.round(amount * 100),
    paidBy: newExpensePaidBy.value,
    category: newExpenseCategory.value
  })

  if (!expenseId) return
  newExpenseTitle.value = ''
  newExpenseAmount.value = ''
}

async function handleCreateEvent() {
  await createEvent(newEventTitle.value)
  newEventTitle.value = ''
}

async function handleAddEventExpense(eventId: string) {
  const state = eventForms[eventId]
  if (!state) return

  const amount = Number(String(state.amount).replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0 || !state.paidBy || !state.title.trim()) return

  await addExpense({
    title: state.title,
    amountInCents: Math.round(amount * 100),
    paidBy: state.paidBy,
    category: state.category,
    eventId
  })

  state.title = ''
  state.amount = ''
}
</script>

<template>
  <div class="space-y-4">
    <BalanceSummary
      :balances="balanceInfo.balances"
      :total-spent="balanceInfo.totalSpent"
      :couple="couple"
    />

    <section class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">Ausgabe hinzufügen</h3>

      <input
        v-model="newExpenseTitle"
        type="text"
        placeholder="Wofür war die Ausgabe?"
        class="w-full px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
      />

      <div class="grid grid-cols-12 gap-2">
        <div class="col-span-4 relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
          <input
            v-model="newExpenseAmount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            class="w-full pl-8 pr-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
        </div>

        <select
          v-model="newExpenseCategory"
          class="col-span-4 px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        >
          <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <select
          v-model="newExpensePaidBy"
          class="col-span-4 px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        >
          <option v-for="(name, uid) in couple?.memberNames || {}" :key="uid" :value="uid">
            {{ name }}
          </option>
        </select>
      </div>

      <button
        @click="handleAddExpense"
        class="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
      >
        Speichern
      </button>
    </section>

    <section class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">Monatliche Lebensmittel</h3>
      <div v-if="monthlyFoodSummaries.length === 0" class="text-sm text-slate-500">
        Noch keine Lebensmittel-Ausgaben vorhanden.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="entry in monthlyFoodSummaries"
          :key="entry.monthKey"
          class="bg-slate-700/50 rounded-xl px-3 py-2 flex items-center justify-between"
        >
          <div>
            <p class="text-sm font-medium text-slate-100">{{ formatMonth(entry.monthKey) }}</p>
            <p class="text-xs text-slate-400">Pro Person: {{ formatEuro(entry.perPerson) }} €</p>
          </div>
          <p class="text-sm font-semibold text-green-400">{{ formatEuro(entry.total) }} €</p>
        </div>
      </div>
    </section>

    <section class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">Events</h3>

      <form @submit.prevent="handleCreateEvent" class="flex gap-2">
        <input
          v-model="newEventTitle"
          type="text"
          placeholder="Neues Event (z. B. Urlaub)"
          class="flex-1 px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
        <button
          type="submit"
          :disabled="!newEventTitle.trim()"
          class="px-4 py-2.5 bg-slate-700 text-slate-100 rounded-xl text-sm font-medium hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          Anlegen
        </button>
      </form>

      <div v-if="activeEventSummaries.length === 0" class="text-sm text-slate-500">
        Keine aktiven Events.
      </div>

      <article
        v-for="summary in activeEventSummaries"
        :key="summary.event.id"
        class="bg-slate-700/50 rounded-xl border border-slate-600 p-3 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-semibold text-slate-100">{{ summary.event.title }}</h4>
            <p class="text-xs text-slate-400">
              Gesamt: {{ formatEuro(summary.total) }} € · Pro Person: {{ formatEuro(summary.perPerson) }} €
            </p>
          </div>
          <button
            @click="setEventArchived(summary.event.id, true)"
            class="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Archivieren
          </button>
        </div>

        <template v-if="eventForms[summary.event.id]">
          <div class="grid grid-cols-12 gap-2">
            <input
              v-model="eventForms[summary.event.id].title"
              type="text"
              placeholder="Event-Ausgabe"
              class="col-span-5 px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <input
              v-model="eventForms[summary.event.id].amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Betrag"
              class="col-span-2 px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <select
              v-model="eventForms[summary.event.id].category"
              class="col-span-3 px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <button
              @click="handleAddEventExpense(summary.event.id)"
              class="col-span-2 px-3 py-2.5 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 transition-colors"
            >
              +
            </button>
          </div>

          <select
            v-model="eventForms[summary.event.id].paidBy"
            class="w-full px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          >
            <option v-for="(name, uid) in couple?.memberNames || {}" :key="uid" :value="uid">
              {{ name }}
            </option>
          </select>
        </template>

        <div v-if="summary.expenses.length === 0" class="text-xs text-slate-500">
          Noch keine Ausgaben in diesem Event.
        </div>
        <div v-else class="space-y-1">
          <div
            v-for="expense in summary.expenses"
            :key="expense.id"
            class="flex items-center justify-between text-sm"
          >
            <p class="text-slate-200 truncate">
              {{ expense.title }} <span class="text-slate-500">({{ getMemberName(expense.paidBy) }})</span>
            </p>
            <p class="text-slate-300 font-medium">{{ formatEuro(expense.amount) }} €</p>
          </div>
        </div>
      </article>

      <details v-if="archivedEventSummaries.length > 0" class="rounded-xl border border-slate-600 px-3 py-2">
        <summary class="text-sm text-slate-300 cursor-pointer">
          Archivierte Events ({{ archivedEventSummaries.length }})
        </summary>
        <div class="mt-3 space-y-2">
          <div
            v-for="summary in archivedEventSummaries"
            :key="summary.event.id"
            class="flex items-center justify-between text-sm"
          >
            <div>
              <p class="text-slate-200">{{ summary.event.title }}</p>
              <p class="text-xs text-slate-500">Gesamt: {{ formatEuro(summary.total) }} €</p>
            </div>
            <button
              @click="setEventArchived(summary.event.id, false)"
              class="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Reaktivieren
            </button>
          </div>
        </div>
      </details>
    </section>

    <section>
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide mb-2">Letzte Ausgaben</h3>

      <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>
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
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-100 truncate">{{ expense.title }}</p>
            <p class="text-xs text-slate-500 truncate">
              {{ getMemberName(expense.paidBy) }} · {{ categoryOptions.find(o => o.value === expense.category)?.label || 'Sonstiges' }}
              <span v-if="expense.eventId">· Event</span>
              <span v-if="expense.source === 'shopping'">· aus Einkauf</span>
            </p>
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
    </section>
  </div>
</template>

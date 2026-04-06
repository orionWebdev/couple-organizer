<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAccordionGroup,
  IonAccordion,
  IonSpinner,
  IonNote
} from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
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

const showAddExpenseModal = ref(false)
const showEventModal = ref(false)

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
  showAddExpenseModal.value = false
}

async function handleCreateEvent() {
  await createEvent(newEventTitle.value)
  newEventTitle.value = ''
  showEventModal.value = false
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

    <!-- Monthly food summaries -->
    <ion-card v-if="monthlyFoodSummaries.length > 0">
      <ion-card-header>
        <ion-card-title class="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Monatliche Lebensmittel
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list lines="none">
          <ion-item v-for="entry in monthlyFoodSummaries" :key="entry.monthKey">
            <ion-label>
              <h3 class="text-sm font-medium">{{ formatMonth(entry.monthKey) }}</h3>
              <p class="text-xs text-slate-400">Pro Person: {{ formatEuro(entry.perPerson) }} €</p>
            </ion-label>
            <ion-note slot="end" class="text-sm font-semibold text-green-400">
              {{ formatEuro(entry.total) }} €
            </ion-note>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <!-- Events -->
    <ion-card>
      <ion-card-header>
        <div class="flex items-center justify-between">
          <ion-card-title class="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Events
          </ion-card-title>
          <ion-button fill="clear" size="small" @click="showEventModal = true">
            + Neues Event
          </ion-button>
        </div>
      </ion-card-header>
      <ion-card-content>
        <div v-if="activeEventSummaries.length === 0" class="text-sm text-slate-500">
          Keine aktiven Events.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="summary in activeEventSummaries"
            :key="summary.event.id"
            class="bg-slate-700/50 rounded-xl border border-slate-600 p-3 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-semibold">{{ summary.event.title }}</h4>
                <p class="text-xs text-slate-400">
                  Gesamt: {{ formatEuro(summary.total) }} € · Pro Person: {{ formatEuro(summary.perPerson) }} €
                </p>
              </div>
              <ion-button
                fill="clear"
                size="small"
                color="medium"
                @click="setEventArchived(summary.event.id, true)"
              >
                Archivieren
              </ion-button>
            </div>

            <template v-if="eventForms[summary.event.id]">
              <div class="flex gap-2">
                <ion-input
                  v-model="eventForms[summary.event.id].title"
                  placeholder="Event-Ausgabe"
                  fill="outline"
                  size="small"
                  class="flex-1"
                />
                <ion-input
                  v-model="eventForms[summary.event.id].amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Betrag"
                  fill="outline"
                  size="small"
                  class="max-w-24"
                />
                <ion-button size="small" @click="handleAddEventExpense(summary.event.id)">+</ion-button>
              </div>
              <div class="flex gap-2">
                <ion-select
                  v-model="eventForms[summary.event.id].category"
                  fill="outline"
                  interface="action-sheet"
                  class="flex-1"
                >
                  <ion-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </ion-select-option>
                </ion-select>
                <ion-select
                  v-model="eventForms[summary.event.id].paidBy"
                  fill="outline"
                  interface="action-sheet"
                  class="flex-1"
                >
                  <ion-select-option v-for="(name, uid) in couple?.memberNames || {}" :key="uid" :value="uid">
                    {{ name }}
                  </ion-select-option>
                </ion-select>
              </div>
            </template>

            <div v-if="summary.expenses.length === 0" class="text-xs text-slate-500">
              Noch keine Ausgaben in diesem Event.
            </div>
            <ion-list v-else lines="none">
              <ion-item v-for="expense in summary.expenses" :key="expense.id" class="--ion-item-background: transparent">
                <ion-label>
                  <p class="text-sm">{{ expense.title }} <span class="text-slate-500">({{ getMemberName(expense.paidBy) }})</span></p>
                </ion-label>
                <ion-note slot="end" class="text-sm font-medium">{{ formatEuro(expense.amount) }} €</ion-note>
              </ion-item>
            </ion-list>
          </div>
        </div>

        <!-- Archived events -->
        <ion-accordion-group v-if="archivedEventSummaries.length > 0" class="mt-4">
          <ion-accordion value="archived">
            <ion-item slot="header">
              <ion-label class="text-sm">Archivierte Events ({{ archivedEventSummaries.length }})</ion-label>
            </ion-item>
            <div slot="content" class="p-3 space-y-2">
              <div
                v-for="summary in archivedEventSummaries"
                :key="summary.event.id"
                class="flex items-center justify-between"
              >
                <div>
                  <p class="text-sm">{{ summary.event.title }}</p>
                  <p class="text-xs text-slate-500">Gesamt: {{ formatEuro(summary.total) }} €</p>
                </div>
                <ion-button
                  fill="clear"
                  size="small"
                  color="medium"
                  @click="setEventArchived(summary.event.id, false)"
                >
                  Reaktivieren
                </ion-button>
              </div>
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </ion-card-content>
    </ion-card>

    <!-- Recent expenses -->
    <section>
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide mb-2 px-1">Letzte Ausgaben</h3>

      <p v-if="error" class="text-center text-red-400 text-sm py-2">{{ error }}</p>

      <div v-if="loading" class="flex justify-center py-8">
        <ion-spinner name="crescent" color="primary" />
      </div>

      <div v-else-if="expenses.length === 0" class="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-slate-500 text-sm">Noch keine Ausgaben</p>
      </div>

      <ion-list v-else lines="none" class="space-y-2">
        <ion-item-sliding v-for="expense in expenses" :key="expense.id">
          <ion-item class="rounded-xl">
            <ion-label>
              <h3 class="text-sm font-medium">{{ expense.title }}</h3>
              <p class="text-xs text-slate-500">
                {{ getMemberName(expense.paidBy) }} · {{ categoryOptions.find(o => o.value === expense.category)?.label || 'Sonstiges' }}
                <span v-if="expense.eventId"> · Event</span>
                <span v-if="expense.source === 'shopping'"> · aus Einkauf</span>
              </p>
            </ion-label>
            <ion-note slot="end" class="text-sm font-semibold">{{ formatEuro(expense.amount) }} €</ion-note>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="deleteExpense(expense.id)">
              Löschen
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </section>

    <!-- FAB to add expense -->
    <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="mb-2 mr-2">
      <ion-fab-button @click="showAddExpenseModal = true" color="primary">
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
    </ion-fab>

    <!-- Add Expense Modal -->
    <ion-modal
      :is-open="showAddExpenseModal"
      :breakpoints="[0, 0.55]"
      :initial-breakpoint="0.55"
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
          <div class="flex gap-2">
            <ion-input
              v-model="newExpenseAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              fill="outline"
              label="Betrag (€)"
              label-placement="floating"
              class="flex-1"
            />
            <ion-select
              v-model="newExpenseCategory"
              label="Kategorie"
              label-placement="floating"
              fill="outline"
              interface="action-sheet"
              class="flex-1"
            >
              <ion-select-option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </ion-select-option>
            </ion-select>
          </div>
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
          <ion-button expand="block" @click="handleAddExpense">
            Speichern
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Create Event Modal -->
    <ion-modal
      :is-open="showEventModal"
      :breakpoints="[0, 0.3]"
      :initial-breakpoint="0.3"
      @did-dismiss="showEventModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Neues Event</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showEventModal = false">Fertig</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <form @submit.prevent="handleCreateEvent" class="space-y-4">
          <ion-input
            v-model="newEventTitle"
            placeholder="z. B. Urlaub"
            fill="outline"
            label="Event-Titel"
            label-placement="floating"
            :clear-input="true"
          />
          <ion-button expand="block" type="submit" :disabled="!newEventTitle.trim()">
            Anlegen
          </ion-button>
        </form>
      </ion-content>
    </ion-modal>
  </div>
</template>

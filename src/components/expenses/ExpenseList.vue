<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
import { useAuth } from '@/composables/useAuth'
import { useExpenses } from '@/composables/useExpenses'
import type { Couple, Expense, ExpenseCategory, FinanceEvent } from '@/types'
import AppSegmentToggle from '@/components/ui/AppSegmentToggle.vue'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import ExpenseArchiveModal from './ExpenseArchiveModal.vue'
import ExpenseEventsView from './ExpenseEventsView.vue'
import ExpenseMonthlyView from './ExpenseMonthlyView.vue'
import ExpenseOverviewView from './ExpenseOverviewView.vue'

type FinanceView = 'overview' | 'monthly' | 'events'
type ExpenseMode = 'monthly' | 'event'

const props = defineProps<{
  coupleId: string
  couple: Couple | null
  createRequestKey?: number
}>()

const { user } = useAuth()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const {
  events,
  loading,
  error,
  balanceInfo,
  recentExpenses,
  monthlySummaries,
  activeEventSummaries,
  archivedEventSummaries,
  activeEvents,
  addExpense,
  updateExpense,
  createEvent,
  deleteEvent,
  setEventArchived,
  setExpensePaid
} = useExpenses(coupleIdRef)

const activeView = ref<FinanceView>('overview')
const newExpenseMode = ref<ExpenseMode>('monthly')
const newExpenseTitle = ref('')
const newExpenseAmount = ref('')
const newExpenseCategory = ref<ExpenseCategory>('food')
const newExpensePaidBy = ref(user.value?.uid || '')
const newExpenseEventId = ref('')
const privateShares = reactive<Record<string, string>>({})

const newEventTitle = ref('')

const showAddExpenseModal = ref(false)
const showEventModal = ref(false)
const showArchiveModal = ref(false)
const editingExpenseId = ref<string | null>(null)
const editingOriginalAmountInCents = ref<number | null>(null)
const editingOriginalOwedBy = ref<Record<string, number> | null>(null)
const expenseFormError = ref<string | null>(null)
const eventFormError = ref<string | null>(null)

const viewOptions = [
  { label: 'Overview', value: 'overview' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Events', value: 'events' }
] as const

const expenseTypeOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Event', value: 'event' }
] as const

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'food', label: 'Lebensmittel' },
  { value: 'transport', label: 'Transport' },
  { value: 'home', label: 'Wohnen' },
  { value: 'leisure', label: 'Freizeit' },
  { value: 'other', label: 'Sonstiges' }
]

const archivedEntries = computed(() => {
  return archivedEventSummaries.value.map((summary) => ({
    id: summary.event.id,
    title: summary.event.title,
    kind: summary.event.kind
  }))
})

const selectableEvents = computed(() => {
  return activeEvents.value.filter((event) => event.kind === 'event')
})

watch(() => props.couple, (couple) => {
  if (!couple) return
  const fallback = user.value?.uid || Object.keys(couple.memberNames)[0] || ''
  if (!newExpensePaidBy.value || !(newExpensePaidBy.value in couple.memberNames)) {
    newExpensePaidBy.value = fallback
  }
  for (const uid of Object.keys(couple.memberNames)) {
    if (!(uid in privateShares)) privateShares[uid] = ''
  }
}, { immediate: true })

watch(newExpenseMode, (mode) => {
  if (mode === 'monthly') {
    const selectedEvent = getSelectedEvent()
    if (!selectedEvent || selectedEvent.kind !== 'monthly') {
      newExpenseEventId.value = ''
    }
    return
  }

  if (!newExpenseEventId.value && selectableEvents.value.length > 0) {
    newExpenseEventId.value = selectableEvents.value[0].id
  }
})

watch(selectableEvents, (next) => {
  if (newExpenseMode.value !== 'event') return
  if (next.some((event) => event.id === newExpenseEventId.value)) return
  newExpenseEventId.value = next[0]?.id || ''
})

function getSelectedEvent(): Readonly<FinanceEvent> | null {
  return events.value.find((entry) => entry.id === newExpenseEventId.value) || null
}

function getDefaultExpenseMode(): ExpenseMode {
  if (activeView.value === 'events' && selectableEvents.value.length > 0) {
    return 'event'
  }

  return 'monthly'
}

function resolveExpenseEventId(): string | null {
  const selectedEvent = getSelectedEvent()

  if (newExpenseMode.value === 'event') {
    return newExpenseEventId.value || null
  }

  return selectedEvent?.kind === 'monthly' ? selectedEvent.id : null
}

function resetPrivateShares() {
  for (const uid of Object.keys(privateShares)) {
    privateShares[uid] = ''
  }
}

function clearExpenseForm() {
  newExpenseTitle.value = ''
  newExpenseAmount.value = ''
  newExpenseCategory.value = 'food'
  newExpenseMode.value = getDefaultExpenseMode()
  newExpenseEventId.value = newExpenseMode.value === 'event' ? selectableEvents.value[0]?.id || '' : ''
  editingExpenseId.value = null
  editingOriginalAmountInCents.value = null
  editingOriginalOwedBy.value = null
  expenseFormError.value = null
  resetPrivateShares()

  const memberIds = Object.keys(props.couple?.memberNames || {})
  if (!newExpensePaidBy.value || !memberIds.includes(newExpensePaidBy.value)) {
    newExpensePaidBy.value = user.value?.uid || memberIds[0] || ''
  }
}

function closeExpenseModal() {
  showAddExpenseModal.value = false
  clearExpenseForm()
}

function openAddExpenseModal() {
  clearExpenseForm()
  showAddExpenseModal.value = true
}

function closeEventModal() {
  showEventModal.value = false
  newEventTitle.value = ''
  eventFormError.value = null
}

function hasPrivateShareInput(): boolean {
  return Object.values(privateShares).some((value) => String(value || '').trim() !== '')
}

function scaleOwedBy(original: Record<string, number>, nextAmountInCents: number): Record<string, number> | null {
  const members = Object.keys(props.couple?.memberNames || {})
  if (members.length === 0) return {}

  const originalEntries = members.map((uid) => ({
    uid,
    amount: Math.max(0, original[uid] || 0)
  }))
  const originalTotal = originalEntries.reduce((sum, entry) => sum + entry.amount, 0)

  if (originalTotal <= 0) {
    return buildOwedBy(nextAmountInCents / 100)
  }

  const withFractions = originalEntries.map((entry) => {
    const exact = (entry.amount / originalTotal) * nextAmountInCents
    const floored = Math.floor(exact)
    return {
      uid: entry.uid,
      amount: floored,
      fraction: exact - floored
    }
  })

  let remainder = nextAmountInCents - withFractions.reduce((sum, entry) => sum + entry.amount, 0)

  withFractions
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((entry) => {
      if (remainder <= 0) return
      entry.amount += 1
      remainder -= 1
    })

  return Object.fromEntries(withFractions.map((entry) => [entry.uid, entry.amount]))
}

function buildOwedBy(totalAmountInEuro: number): Record<string, number> | null {
  const members = Object.keys(props.couple?.memberNames || {})
  if (members.length === 0) return {}

  const totalInCents = Math.round(totalAmountInEuro * 100)
  const personalShares = members.map((uid) => ({
    uid,
    cents: Math.max(0, Math.round(Number(String(privateShares[uid] || '').replace(',', '.')) * 100) || 0)
  }))

  const personalTotal = personalShares.reduce((sum, entry) => sum + entry.cents, 0)
  if (personalTotal > totalInCents) return null

  const sharedRemainder = totalInCents - personalTotal
  const baseShare = Math.floor(sharedRemainder / members.length)
  const remainder = sharedRemainder % members.length
  const owedBy: Record<string, number> = {}

  members.forEach((uid, index) => {
    const personal = personalShares.find((entry) => entry.uid === uid)?.cents || 0
    owedBy[uid] = personal + baseShare + (index < remainder ? 1 : 0)
  })

  return owedBy
}

function resolveOwedBy(amountInCents: number): Record<string, number> | null {
  if (hasPrivateShareInput()) {
    return buildOwedBy(amountInCents / 100)
  }

  if (editingExpenseId.value && editingOriginalOwedBy.value) {
    if (editingOriginalAmountInCents.value === amountInCents) {
      return { ...editingOriginalOwedBy.value }
    }
    return scaleOwedBy(editingOriginalOwedBy.value, amountInCents)
  }

  return buildOwedBy(amountInCents / 100)
}

async function handleAddExpense() {
  const title = newExpenseTitle.value.trim()
  const amount = Number(String(newExpenseAmount.value).replace(',', '.'))
  expenseFormError.value = null

  if (!title) {
    expenseFormError.value = 'Bitte gib einen Titel fuer den Finanzeintrag ein.'
    return
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    expenseFormError.value = 'Bitte gib einen gueltigen Betrag groesser als 0 ein.'
    return
  }

  if (!newExpensePaidBy.value) {
    expenseFormError.value = 'Bitte waehle aus, wer den Betrag bezahlt hat.'
    return
  }

  if (newExpenseMode.value === 'event' && !newExpenseEventId.value) {
    expenseFormError.value = 'Bitte waehle ein Event aus oder lege zuerst eins an.'
    return
  }

  const amountInCents = Math.round(amount * 100)
  const owedBy = resolveOwedBy(amountInCents)

  if (!owedBy) {
    expenseFormError.value = 'Die privaten Anteile sind hoeher als der Gesamtbetrag. Bitte pruefe deine Eingaben.'
    return
  }

  const payload = {
    title,
    amountInCents,
    paidBy: newExpensePaidBy.value,
    owedBy,
    category: newExpenseCategory.value,
    eventId: resolveExpenseEventId()
  }

  if (editingExpenseId.value) {
    const wasUpdated = await updateExpense(editingExpenseId.value, payload)

    if (!wasUpdated) {
      expenseFormError.value = 'Der Finanzeintrag konnte nicht gespeichert werden. Bitte versuche es erneut.'
      return
    }
  } else {
    const expenseId = await addExpense(payload)

    if (!expenseId) {
      expenseFormError.value = 'Der Finanzeintrag konnte nicht erstellt werden. Bitte versuche es erneut.'
      return
    }
  }

  closeExpenseModal()
}

async function handleCreateEvent() {
  const title = newEventTitle.value.trim()
  eventFormError.value = null

  if (!title) {
    eventFormError.value = 'Bitte gib einen Namen fuer das Event ein.'
    return
  }

  await createEvent(title, { kind: 'event' })
  closeEventModal()
}

async function handleDeleteArchivedEvent(eventId: string) {
  const wasDeleted = await deleteEvent(eventId)
  if (wasDeleted && archivedEntries.value.length <= 1) {
    showArchiveModal.value = false
  }
}

function openCreateEventFromExpense() {
  showAddExpenseModal.value = false
  showEventModal.value = true
}

function openEditExpenseModal(expense: Readonly<Expense>) {
  clearExpenseForm()
  editingExpenseId.value = expense.id
  editingOriginalAmountInCents.value = expense.amount
  editingOriginalOwedBy.value = { ...expense.owedBy }
  newExpenseTitle.value = expense.title
  newExpenseAmount.value = (expense.amount / 100).toFixed(2)
  newExpenseCategory.value = expense.category
  newExpensePaidBy.value = expense.paidBy
  newExpenseEventId.value = expense.eventId || ''

  const linkedEvent = expense.eventId ? events.value.find((entry) => entry.id === expense.eventId) : null
  newExpenseMode.value = linkedEvent?.kind === 'event' ? 'event' : 'monthly'

  showAddExpenseModal.value = true
}

watch(() => props.createRequestKey, (next, previous) => {
  if (!next || next === previous) return
  openAddExpenseModal()
})
</script>

<template>
  <section class="space-y-5 pb-4">
    <div class="finance-page-header">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Finance</p>
        <h1 class="mt-2 text-[2rem] font-semibold tracking-tight text-slate-50">Einfach geteilt</h1>
      </div>

      <div class="finance-header-actions">
        <button type="button" class="finance-pill-button" @click="showEventModal = true">
          Event
        </button>
        <button type="button" class="finance-add-button" @click="openAddExpenseModal">
          <ion-icon :icon="addOutline" />
          Ausgabe
        </button>
      </div>
    </div>

    <AppSegmentToggle
      v-model="activeView"
      :options="[...viewOptions]"
    />

    <p class="px-1 text-sm text-slate-400">
      Eine Ausgabe ist jetzt entweder monatlich oder gehört zu einem Event.
    </p>

    <div v-if="error" class="text-center text-sm text-red-400">{{ error }}</div>

    <div v-if="loading" class="flex justify-center py-12">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <template v-else>
      <ExpenseOverviewView
        v-if="activeView === 'overview'"
        :couple="couple"
        :current-user-id="user?.uid"
        :balance-info="balanceInfo"
        :recent-expenses="recentExpenses"
        @edit="openEditExpenseModal"
        @toggle-paid="setExpensePaid"
      />

      <ExpenseMonthlyView
        v-else-if="activeView === 'monthly'"
        :couple="couple"
        :months="monthlySummaries"
        @edit="openEditExpenseModal"
        @toggle-paid="setExpensePaid"
      />

      <ExpenseEventsView
        v-else
        :couple="couple"
        :events="activeEventSummaries"
        @edit="openEditExpenseModal"
        @toggle-paid="setExpensePaid"
        @archive="setEventArchived($event, true)"
        @open-archive="showArchiveModal = true"
      />
    </template>

    <AppSheetModal
      :is-open="showAddExpenseModal"
      :title="editingExpenseId ? 'Ausgabe bearbeiten' : 'Ausgabe hinzufügen'"
      :breakpoints="[0, 0.72, 0.92]"
      :initial-breakpoint="0.72"
      close-label="Fertig"
      @close="closeExpenseModal"
    >
      <form class="space-y-4" @submit.prevent="handleAddExpense">
        <div v-if="expenseFormError" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {{ expenseFormError }}
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-300">Bereich</p>
          <AppSegmentToggle
            v-model="newExpenseMode"
            :options="[...expenseTypeOptions]"
          />
        </div>

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

        <div v-if="newExpenseMode === 'event'" class="space-y-3">
          <ion-select
            v-model="newExpenseEventId"
            label="Event"
            label-placement="floating"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option v-for="event in selectableEvents" :key="event.id" :value="event.id">
              {{ event.title }}
            </ion-select-option>
          </ion-select>

          <div v-if="selectableEvents.length === 0" class="rounded-2xl border border-slate-700/80 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
            Es gibt noch kein Event. Lege zuerst eines an.
            <button type="button" class="finance-inline-link" @click="openCreateEventFromExpense">
              Event erstellen
            </button>
          </div>
        </div>

        <div v-if="couple" class="space-y-2">
          <p class="text-sm font-medium text-slate-300">Private Anteile auf dem Beleg</p>
          <div
            v-for="(name, uid) in couple.memberNames"
            :key="uid"
            class="flex items-center gap-2"
          >
            <span class="w-28 shrink-0 text-sm text-slate-400">{{ name }}</span>
            <ion-input
              v-model="privateShares[uid]"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              fill="outline"
            />
          </div>
          <p class="text-xs text-slate-500">
            Private Anteile werden nur dieser Person berechnet, der Rest wird weiterhin geteilt.
          </p>
          <p v-if="editingExpenseId" class="text-xs text-slate-500">
            Wenn du den Betrag aenderst, bleiben die bisherigen Anteile erhalten, solange du hier nichts Neues eintraegst.
          </p>
        </div>

        <ion-button expand="block" type="submit">
          {{ editingExpenseId ? 'Aenderungen speichern' : 'Speichern' }}
        </ion-button>
      </form>
    </AppSheetModal>

    <AppSheetModal
      :is-open="showEventModal"
      title="Neues Event"
      :breakpoints="[0, 0.45, 0.62]"
      :initial-breakpoint="0.45"
      close-label="Schließen"
      @close="closeEventModal"
    >
      <div class="space-y-4">
        <div v-if="eventFormError" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {{ eventFormError }}
        </div>

        <ion-input
          v-model="newEventTitle"
          placeholder="z. B. Urlaub, Hochzeit oder Konzert"
          fill="outline"
          label="Eventname"
          label-placement="floating"
        />

        <p class="text-sm text-slate-400">
          Events bündeln gemeinsame Ausgaben für Anlässe. Alles andere bleibt automatisch monatlich.
        </p>

        <ion-button expand="block" :disabled="!newEventTitle.trim()" @click="handleCreateEvent">
          Event anlegen
        </ion-button>
      </div>
    </AppSheetModal>

    <ExpenseArchiveModal
      :is-open="showArchiveModal"
      :entries="archivedEntries"
      @close="showArchiveModal = false"
      @reactivate="setEventArchived($event, false)"
      @delete="handleDeleteArchivedEvent"
    />
  </section>
</template>

<style scoped>
.finance-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.25rem;
}

.finance-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.finance-pill-button {
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 9999px;
  padding: 0.65rem 1rem;
  background: rgba(30, 41, 59, 0.7);
  color: var(--app-text-muted);
  font-size: 1.0625rem;
  font-weight: 600;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.finance-add-button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 9999px;
  padding: 0.65rem 1rem;
  background: rgba(34, 197, 94, 0.16);
  color: rgb(134 239 172);
  font-family: var(--ion-font-family);
  font-size: 1.0625rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, transform 0.1s;
}

.finance-add-button ion-icon {
  font-size: 1.15rem;
}

.finance-add-button:active {
  background: rgba(34, 197, 94, 0.26);
  transform: scale(0.97);
}

.finance-inline-link {
  margin-left: 0.45rem;
  border: 0;
  background: transparent;
  padding: 0;
  color: rgb(191 219 254);
  font-weight: 600;
}
</style>

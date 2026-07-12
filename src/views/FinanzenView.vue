<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useExpenses } from '@/composables/useExpenses'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { showToast } from '@/composables/useToast'
import SegmentToggle from '@/components/ui/SegmentToggle.vue'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import BalanceCard from '@/components/finance/BalanceCard.vue'
import ExpenseRow from '@/components/finance/ExpenseRow.vue'
import EventCard from '@/components/finance/EventCard.vue'
import EventDetail from '@/components/finance/EventDetail.vue'
import AddExpenseSheet from '@/components/finance/AddExpenseSheet.vue'
import FinanzCoachView from '@/components/finance/FinanzCoachView.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useJustAdded } from '@/composables/useJustAdded'
import type { Expense } from '@/types'

const { user } = useAuth()
const { couple } = useCouple()

const coupleId = computed(() => user.value?.coupleId ?? null)
const {
  expenses,
  balanceInfo,
  loading,
  activeEventSummaries,
  eventSummaries,
  financeMonths,
  addExpense,
  updateExpense,
  deleteExpense,
  markAllPaid,
  createEvent,
  setEventArchived,
} = useExpenses(coupleId)

const finView = ref<'dashboard' | 'event'>('dashboard')
const currentEventId = ref<string | null>(null)

const currentEventSummary = computed(() =>
  eventSummaries.value.find((s) => s.event.id === currentEventId.value) ?? null
)

function openEvent(eventId: string) {
  currentEventId.value = eventId
  finView.value = 'event'
}

function backToDashboard() {
  finView.value = 'dashboard'
  currentEventId.value = null
}

type Tab = 'uebersicht' | 'coach'
const tab = ref<Tab>('uebersicht')
const tabOptions = [
  { label: 'Übersicht', value: 'uebersicht' },
  { label: 'Finanz-Coach', value: 'coach' },
]

// Reihenfolge muss die sichtbare Tab-Reihenfolge widerspiegeln.
const tabOrder: Tab[] = ['uebersicht', 'coach']
const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(tabOrder, tab)

const showAdd = ref(false)
const showSettle = ref(false)
const startInEventMode = ref(false)
const editingExpense = ref<Expense | null>(null)

function openAddExpense() {
  startInEventMode.value = false
  editingExpense.value = null
  showAdd.value = true
}

function openNewEvent() {
  startInEventMode.value = true
  editingExpense.value = null
  showAdd.value = true
}

function openAddForCurrentEvent() {
  startInEventMode.value = false
  editingExpense.value = null
  showAdd.value = true
}

function openEditExpense(expense: Expense) {
  editingExpense.value = expense
  startInEventMode.value = false
  showAdd.value = true
}

function closeAdd() {
  showAdd.value = false
  editingExpense.value = null
}

async function onSubmitExpense(payload: Parameters<typeof addExpense>[0]) {
  if (editingExpense.value) {
    // eventId der bestehenden Ausgabe beibehalten
    await updateExpense(editingExpense.value.id, {
      title: payload.title,
      amountInCents: payload.amountInCents,
      paidBy: payload.paidBy,
      owedBy: payload.owedBy,
      category: payload.category,
      eventId: editingExpense.value.eventId,
    })
    showToast('Ausgabe aktualisiert')
  } else {
    await addExpense({
      ...payload,
      eventId: finView.value === 'event' ? currentEventId.value : null,
    })
    showToast('Ausgabe gespeichert')
  }
  closeAdd()
}

async function onSubmitEvent(payload: { title: string; dateLabel: string }) {
  await createEvent(payload.title)
  showAdd.value = false
  showToast(`„${payload.title}" angelegt ✓`)
}

async function onDeleteExpense(id: string) {
  await deleteExpense(id)
  showToast('Ausgabe gelöscht')
}

async function onSettle() {
  showSettle.value = false
  const ids = expenses.value
    .filter(e => !e.isPaid)
    .map(e => e.id)
  await markAllPaid(ids)
  showToast('Saldo ausgeglichen')
}

async function onSettleEvent() {
  if (!currentEventSummary.value) return
  const ids = currentEventSummary.value.expenses
    .filter((e) => !e.isPaid)
    .map((e) => e.id)
  await markAllPaid(ids)
  await setEventArchived(currentEventSummary.value.event.id, true)
  showToast('Event ausgeglichen')
  backToDashboard()
}

const sortedExpenses = computed(() =>
  [...expenses.value]
    .filter(e => !e.isPaid && !e.eventId)
    .sort((a, b) => {
      const ta = (a.createdAt as any)?.toMillis?.() ?? 0
      const tb = (b.createdAt as any)?.toMillis?.() ?? 0
      return tb - ta
    })
)

const { justAdded: justAddedExpense } = useJustAdded(() => sortedExpenses.value, e => e.id)
</script>

<template>
  <div class="finanzen-page area-finanzen">
    <template v-if="finView === 'dashboard'">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Finanzen</h1>
        <ProfileButton />
      </div>

      <div class="tab-bar-wrap">
        <SegmentToggle v-model="tab" :options="tabOptions" class="tab-bar" />
      </div>

      <div
        class="tab-area"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchEnd"
      >
        <div class="tab-content">
          <Transition name="tab-fade" mode="out-in">
            <div v-if="tab === 'uebersicht'" key="uebersicht" class="uebersicht-pane">
              <!-- Balance card -->
              <BalanceCard
                :balanceInfo="balanceInfo"
                :couple="couple"
                :currentUserId="user?.uid ?? ''"
                @settle="showSettle = true"
              />

              <!-- Events rail -->
              <TransitionGroup v-if="!loading" tag="div" name="list-add" class="events-rail">
                <EventCard
                  v-for="summary in activeEventSummaries"
                  :key="summary.event.id"
                  :summary="summary"
                  :couple="couple"
                  @click="openEvent(summary.event.id)"
                />
                <button key="new-event" class="new-event-card" @click="openNewEvent">
                  <span class="new-event-icon">+</span>
                  <span class="new-event-label">Neues Event</span>
                </button>
              </TransitionGroup>

              <!-- Expense list -->
              <div v-if="loading" class="loading-row">Laden…</div>
              <div v-else-if="sortedExpenses.length === 0" class="empty-state">
                Noch keine Ausgaben. Füge die erste hinzu.
              </div>
              <TransitionGroup v-else tag="div" name="list-add" class="expense-list">
                <ExpenseRow
                  v-for="exp in sortedExpenses"
                  :key="exp.id"
                  :expense="exp"
                  :couple="couple"
                  :currentUserId="user?.uid ?? ''"
                  :class="{ 'just-added': justAddedExpense.has(exp.id) }"
                  @delete="onDeleteExpense"
                  @edit="openEditExpense"
                />
              </TransitionGroup>
            </div>

            <FinanzCoachView
              v-else
              key="coach"
              :couple="couple"
              :months="financeMonths"
              :loading="loading"
            />
          </Transition>
        </div>

        <!-- Außerhalb der Transition, aber innerhalb der Swipe-Zone — sonst
             würde ein Swipe, der auf dem FAB beginnt, nicht erkannt (der FAB
             läge sonst außerhalb von .tab-area und Touch-Events bubblen nicht
             zwischen Geschwister-Elementen). -->
        <button v-if="tab === 'uebersicht'" class="fab" @click="openAddExpense">
          <span class="fab-plus">+</span>Ausgabe erfassen
        </button>
      </div>
    </template>

    <EventDetail
      v-else-if="currentEventSummary"
      :summary="currentEventSummary"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      @back="backToDashboard"
      @addExpense="openAddForCurrentEvent"
      @deleteExpense="onDeleteExpense"
      @editExpense="openEditExpense"
      @settle="onSettleEvent"
    />

    <!-- Add expense / new event sheet -->
    <AddExpenseSheet
      :isOpen="showAdd"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      :addContext="finView"
      :startInEventMode="startInEventMode"
      :editingExpense="editingExpense"
      @close="closeAdd"
      @submit="onSubmitExpense"
      @submitEvent="onSubmitEvent"
    />

    <!-- Settle confirmation -->
    <BottomSheet :isOpen="showSettle" title="Saldo begleichen?" @close="showSettle = false">
      <p class="settle-text">
        Alle offenen Ausgaben werden als beglichen markiert. Der Saldo wird auf 0 gesetzt.
      </p>
      <button class="btn-primary" @click="onSettle">Begleichen</button>
      <button class="cancel-btn" @click="showSettle = false">Abbrechen</button>
    </BottomSheet>
  </div>
</template>

<style scoped>
.finanzen-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 16px;
}

.page-title {
  font-family: var(--font-headline);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.tab-bar-wrap {
  padding: 0 var(--screen-pad);
  margin-bottom: 20px;
}

.tab-bar {
  display: flex;
  width: 100%;
  border-radius: 12px;
}

.tab-bar :deep(.seg-btn) {
  padding: 9px 0;
  font-size: 12px;
}

.tab-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  touch-action: pan-y;
  padding-bottom: 96px;
}

.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.uebersicht-pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Nur vertikal scrollen — horizontale Gesten gehören dem Tab-Swipe. */
  touch-action: pan-y;
}

/* Sanfter Übergang beim Tab-Wechsel (auch per Swipe) */
.tab-fade-enter-active {
  transition: opacity 220ms var(--ease-standard), transform 220ms var(--ease-standard);
}

.tab-fade-leave-active {
  transition: opacity 140ms var(--ease-in), transform 140ms var(--ease-in);
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.events-rail {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 0 var(--screen-pad) 4px;
  margin-bottom: 24px;
}

.new-event-card {
  flex: 0 0 168px;
  text-align: center;
  cursor: pointer;
  font-family: var(--font-body);
  border: 1.5px dashed var(--border);
  background: transparent;
  border-radius: var(--radius-card);
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.new-event-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: var(--accent-tint);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-size: 20px;
}

.new-event-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.loading-row,
.empty-state {
  padding: 40px var(--screen-pad);
  color: var(--text-faint);
  font-size: 14px;
  text-align: center;
}

.expense-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 0 var(--screen-pad);
}

.fab {
  position: fixed;
  left: 18px;
  right: 18px;
  bottom: calc(104px + var(--safe-bottom));
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
  border-radius: 16px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-accent);
  transition: background 0.18s ease, transform 0.12s ease;
  z-index: 50;
}

.fab-plus {
  font-size: 18px;
  font-weight: 300;
}

.fab:active {
  background: var(--accent-hover);
  transform: scale(0.96);
}

.settle-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 20px;
}

.cancel-btn {
  display: block;
  width: 100%;
  padding: 14px;
  background: none;
  border: none;
  color: var(--text-faint);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
}
</style>

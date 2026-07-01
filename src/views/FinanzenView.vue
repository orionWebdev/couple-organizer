<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useExpenses } from '@/composables/useExpenses'
import { showToast } from '@/composables/useToast'
import BalanceCard from '@/components/finance/BalanceCard.vue'
import ExpenseRow from '@/components/finance/ExpenseRow.vue'
import EventCard from '@/components/finance/EventCard.vue'
import EventDetail from '@/components/finance/EventDetail.vue'
import AddExpenseSheet from '@/components/finance/AddExpenseSheet.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'

const { user } = useAuth()
const { couple } = useCouple()

const coupleId = computed(() => user.value?.coupleId ?? null)
const {
  expenses,
  balanceInfo,
  loading,
  activeEventSummaries,
  eventSummaries,
  addExpense,
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

const showAdd = ref(false)
const showSettle = ref(false)
const startInEventMode = ref(false)

function openAddExpense() {
  startInEventMode.value = false
  showAdd.value = true
}

function openNewEvent() {
  startInEventMode.value = true
  showAdd.value = true
}

function openAddForCurrentEvent() {
  startInEventMode.value = false
  showAdd.value = true
}

async function onSubmitExpense(payload: Parameters<typeof addExpense>[0]) {
  await addExpense({
    ...payload,
    eventId: finView.value === 'event' ? currentEventId.value : null,
  })
  showAdd.value = false
  showToast('Ausgabe gespeichert')
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
</script>

<template>
  <div class="finanzen-page">
    <template v-if="finView === 'dashboard'">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Finanzen</h1>
      </div>

      <!-- Balance card -->
      <BalanceCard
        :balanceInfo="balanceInfo"
        :couple="couple"
        :currentUserId="user?.uid ?? ''"
        @settle="showSettle = true"
      />

      <!-- Events rail -->
      <div v-if="!loading" class="events-rail">
        <EventCard
          v-for="summary in activeEventSummaries"
          :key="summary.event.id"
          :summary="summary"
          :couple="couple"
          @click="openEvent(summary.event.id)"
        />
        <button class="new-event-card" @click="openNewEvent">
          <span class="new-event-icon">+</span>
          <span class="new-event-label">Neues Event</span>
        </button>
      </div>

      <!-- Expense list -->
      <div v-if="loading" class="loading-row">Laden…</div>
      <div v-else-if="sortedExpenses.length === 0" class="empty-state">
        Noch keine Ausgaben. Füge die erste hinzu.
      </div>
      <div v-else class="expense-list">
        <ExpenseRow
          v-for="exp in sortedExpenses"
          :key="exp.id"
          :expense="exp"
          :couple="couple"
          :currentUserId="user?.uid ?? ''"
          @delete="onDeleteExpense"
        />
      </div>

      <!-- FAB -->
      <button class="fab" @click="openAddExpense">Ausgabe +</button>
    </template>

    <EventDetail
      v-else-if="currentEventSummary"
      :summary="currentEventSummary"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      @back="backToDashboard"
      @addExpense="openAddForCurrentEvent"
      @deleteExpense="onDeleteExpense"
      @settle="onSettleEvent"
    />

    <!-- Add expense / new event sheet -->
    <AddExpenseSheet
      :isOpen="showAdd"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      :addContext="finView"
      :startInEventMode="startInEventMode"
      @close="showAdd = false"
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
  min-height: 100%;
  padding-bottom: 24px;
}

.page-header {
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
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
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  border: 1px dashed #3d362e;
  background: transparent;
  border-radius: 16px;
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
  border-radius: 10px;
  border: 1px solid #3d362e;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-size: 20px;
}

.new-event-label {
  font-size: 13px;
  font-weight: 500;
  color: #d8d1c7;
}

.loading-row,
.empty-state {
  padding: 40px var(--screen-pad);
  color: var(--text-faint);
  font-size: 14px;
  text-align: center;
}

.expense-list {
  border-top: 1px solid var(--border-softer);
}

.fab {
  position: fixed;
  bottom: calc(72px + var(--safe-bottom));
  right: 22px;
  padding: 13px 20px;
  background: var(--accent);
  color: #14110d;
  border: none;
  border-radius: 100px;
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition: background 0.18s ease, transform 0.12s ease;
  z-index: 50;
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
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
}
</style>

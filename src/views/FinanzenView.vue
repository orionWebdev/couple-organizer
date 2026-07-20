<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useExpenses } from '@/composables/useExpenses'
import { setFabAction } from '@/composables/useFab'
import { useTabSwipe } from '@/composables/useTabSwipe'
import { showToast } from '@/composables/useToast'
import { useBackDismiss } from '@/composables/useBackButton'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
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
  openMonthlyExpenseIds,
  loading,
  activeEventSummaries,
  archivedEventSummaries,
  eventSummaries,
  financeMonths,
  addExpense,
  updateExpense,
  deleteExpense,
  markAllPaid,
  createEvent,
  setEventArchived,
  updateEventBudget,
} = useExpenses(coupleId)

// Überlebt den Android-Kaltstart. Die Event-Detailansicht hat keine eigene Route.
const finView = usePersistedRef<'dashboard' | 'event'>('finanzen.finView', 'dashboard', { ttlMs: DRAFT_TTL_MS })
const currentEventId = usePersistedRef<string | null>('finanzen.eventId', null, { ttlMs: DRAFT_TTL_MS })

const currentEventSummary = computed(() =>
  eventSummaries.value.find((s) => s.event.id === currentEventId.value) ?? null
)

// Restore-Guard: Wurde 'event' wiederhergestellt, das Event ist aber weg
// (gelöscht/archiviert), rendert keine Template-Branch → zurück aufs Dashboard.
const stopEventRestore = watch(
  () => loading.value,
  (isLoading) => {
    if (isLoading) return
    if (finView.value === 'event' && !currentEventSummary.value) backToDashboard()
    // Bearbeitete Ausgabe aus der ID zurückholen; ist sie weg (gelöscht), den
    // Add-Sheet schließen statt beim Absenden eine neue Ausgabe anzulegen.
    if (editingExpenseId.value) {
      editingExpense.value = expenses.value.find((e) => e.id === editingExpenseId.value) ?? null
      if (showAdd.value && !editingExpense.value) { showAdd.value = false; editingExpenseId.value = null }
    }
    stopEventRestore()
  },
  { immediate: true }
)

function openEvent(eventId: string) {
  currentEventId.value = eventId
  finView.value = 'event'
}

function backToDashboard() {
  finView.value = 'dashboard'
  currentEventId.value = null
}

// Die Event-Detailansicht ist eine In-Page-Unteransicht ohne eigene Route —
// ohne das hier würde Android-Zurück aus ihr heraus die App verlassen.
useBackDismiss(() => finView.value === 'event', backToDashboard)

type Tab = 'uebersicht' | 'coach'
const tab = usePersistedRef<Tab>('finanzen.tab', 'uebersicht')
const tabOptions = [
  { label: 'Übersicht', value: 'uebersicht' },
  { label: 'Finanz-Coach', value: 'coach' },
]

// Reihenfolge muss die sichtbare Tab-Reihenfolge widerspiegeln.
const tabOrder: Tab[] = ['uebersicht', 'coach']
const { onTouchStart, onTouchMove, onTouchEnd } = useTabSwipe(tabOrder, tab)

// Offener Add/Edit-Sheet überlebt den Kaltstart (TTL). Die bearbeitete Ausgabe
// wird über ihre ID wiederhergestellt (siehe stopEventRestore oben).
const showAdd = usePersistedRef('finanzen.showAdd', false, { ttlMs: DRAFT_TTL_MS })
const showSettle = ref(false)
const startInEventMode = usePersistedRef('finanzen.eventMode', false, { ttlMs: DRAFT_TTL_MS })
const editingExpenseId = usePersistedRef<string | null>('finanzen.editExpenseId', null, { ttlMs: DRAFT_TTL_MS })
const editingExpense = ref<Expense | null>(null)

function openAddExpense() {
  startInEventMode.value = false
  editingExpense.value = null
  editingExpenseId.value = null
  showAdd.value = true
}

// Globaler FAB (App-Shell): nur die Übersicht kennt ein Add (Ausgabe erfassen),
// der Finanz-Coach nicht.
watch(tab, (t) => {
  setFabAction(t === 'uebersicht' ? { label: 'Ausgabe erfassen', handler: openAddExpense } : null)
}, { immediate: true })
onScopeDispose(() => setFabAction(null))

function openNewEvent() {
  startInEventMode.value = true
  editingExpense.value = null
  editingExpenseId.value = null
  showAdd.value = true
}

function openAddForCurrentEvent() {
  startInEventMode.value = false
  editingExpense.value = null
  editingExpenseId.value = null
  showAdd.value = true
}

function openEditExpense(expense: Expense) {
  editingExpense.value = expense
  editingExpenseId.value = expense.id
  startInEventMode.value = false
  showAdd.value = true
}

function closeAdd() {
  showAdd.value = false
  editingExpense.value = null
  editingExpenseId.value = null
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

// Der gemeinsame Saldo ist der Saldo der Monatsausgaben. Events bleiben davon
// unberührt — die werden im Event selbst über "Abschließen & Ausgleichen"
// verrechnet.
async function onSettle() {
  showSettle.value = false
  await markAllPaid(openMonthlyExpenseIds.value)
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

// Ein archiviertes Event zurück in die aktive Liste holen (z. B. versehentlich
// abgeschlossen). Die Ausgaben bleiben ausgeglichen (isPaid) — bei Bedarf lässt
// sich dann wieder etwas hinzufügen/verrechnen.
async function onReopenEvent() {
  if (!currentEventSummary.value) return
  await setEventArchived(currentEventSummary.value.event.id, false)
  showToast('Event reaktiviert')
  backToDashboard()
}

// Archiv abgeschlossener Events — eingeklappt, bis man reinschaut.
const showArchive = ref(false)

// ── Optionales Budget eines Events ────────────────────────────
// Gleiche Eingabe-Semantik wie beim Monatsbudget: leeres Feld entfernt es,
// eine unlesbare Eingabe wird abgelehnt statt still zu verwerfen.
const showEventBudget = ref(false)
const eventBudgetInput = ref('')

function openEventBudgetSheet() {
  const budget = currentEventSummary.value?.event.budget ?? null
  eventBudgetInput.value = budget ? (budget / 100).toFixed(2) : ''
  showEventBudget.value = true
}

async function saveEventBudget() {
  const event = currentEventSummary.value?.event
  if (!event) return

  const raw = eventBudgetInput.value.trim().replace(',', '.')

  if (raw === '') {
    const ok = await updateEventBudget(event.id, null)
    showToast(ok ? 'Budget entfernt' : 'Fehler beim Speichern')
    if (ok) showEventBudget.value = false
    return
  }

  const euros = parseFloat(raw)
  if (isNaN(euros) || euros <= 0) {
    showToast('Bitte einen Betrag eingeben')
    return
  }

  const ok = await updateEventBudget(event.id, Math.round(euros * 100))
  showToast(ok ? 'Budget gespeichert' : 'Fehler beim Speichern')
  if (ok) showEventBudget.value = false
}

// Beglichene Ausgaben bleiben in der Liste stehen. "Begleichen" heißt, dass die
// beiden sich untereinander verrechnet haben — nicht, dass das Geld nie
// ausgegeben wurde. Die Zeilen werden nur als ausgeglichen markiert.
const sortedExpenses = computed(() =>
  [...expenses.value]
    .filter(e => !e.eventId)
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
            <div v-if="tab === 'uebersicht'" key="uebersicht" class="uebersicht-pane rise-stagger">
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

              <!-- Archiv abgeschlossener Events — direkt bei den aktiven Events -->
              <div v-if="!loading && archivedEventSummaries.length" class="archive-section">
                <button class="archive-toggle" type="button" @click="showArchive = !showArchive">
                  <span class="archive-caret" :class="{ 'archive-caret--open': showArchive }">›</span>
                  Archiv
                  <span class="archive-count">{{ archivedEventSummaries.length }}</span>
                </button>
                <div v-if="showArchive" class="events-rail archive-rail">
                  <EventCard
                    v-for="summary in archivedEventSummaries"
                    :key="summary.event.id"
                    :summary="summary"
                    :couple="couple"
                    muted
                    @click="openEvent(summary.event.id)"
                  />
                </div>
              </div>

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
              class="rise-stagger"
              :couple="couple"
              :months="financeMonths"
              :loading="loading"
            />
          </Transition>
        </div>
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
      @setBudget="openEventBudgetSheet"
      @reopen="onReopenEvent"
    />

    <BottomSheet
      :isOpen="showEventBudget"
      title="Budget für dieses Event"
      @close="showEventBudget = false"
    >
      <input
        v-model="eventBudgetInput"
        class="app-field"
        type="text"
        inputmode="decimal"
        placeholder="z. B. 250"
        @keyup.enter="saveEventBudget"
      />
      <p class="sheet-hint">Optional. Leer lassen entfernt das Budget.</p>
      <button class="btn-primary" @click="saveEventBudget">Speichern</button>
    </BottomSheet>

    <!-- Add expense / new event sheet -->
    <AddExpenseSheet
      :isOpen="showAdd"
      :couple="couple"
      :currentUserId="user?.uid ?? ''"
      :addContext="finView"
      :startInEventMode="startInEventMode"
      :editingExpense="editingExpense"
      persistKey="finance.expense"
      @close="closeAdd"
      @submit="onSubmitExpense"
      @submitEvent="onSubmitEvent"
    />

    <!-- Settle confirmation -->
    <BottomSheet :isOpen="showSettle" title="Saldo begleichen?" @close="showSettle = false">
      <p class="settle-text">
        Alle offenen Monatsausgaben werden als beglichen markiert. Der Saldo wird auf 0 gesetzt.
        Events bleiben davon unberührt — die rechnet ihr im Event selbst ab.
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
  padding: 13px 0;
  font-size: 13px;
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

/* Archiv abgeschlossener Events — sitzt direkt unter der Events-Rail. Deren
   margin-bottom (24px) liefert den Abstand nach oben. */
.archive-section {
  margin: -8px 0 24px;
  padding: 0 var(--screen-pad);
}

.archive-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border: none;
  background: none;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 800;
  color: var(--text-secondary);
  cursor: pointer;
}

.archive-caret {
  display: inline-block;
  font-size: 16px;
  transition: transform 0.2s var(--ease-standard);
}

.archive-caret--open {
  transform: rotate(90deg);
}

.archive-count {
  min-width: 18px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--surface-deep);
  color: var(--text-meta);
  font-size: 11px;
  text-align: center;
}

.archive-rail {
  margin: 12px calc(-1 * var(--screen-pad)) 0;
  padding-top: 4px;
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

.sheet-hint {
  margin: 8px 0 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-meta);
}
</style>

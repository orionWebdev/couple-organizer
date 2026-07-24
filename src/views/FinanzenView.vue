<script setup lang="ts">
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useExpenses } from '@/composables/useExpenses'
import { setFabAction } from '@/composables/useFab'
import { showToast } from '@/composables/useToast'
import { useBackDismiss } from '@/composables/useBackButton'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
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
import type { CoachAction } from '@/services/ai'

// embedded: als Segment „Geld" innerhalb von AlltagView gerendert. Dann trägt
// die Shell die Kopfzeile (Titel + Profil), und der eigene Segmentumschalter
// wird zur sekundären Zeile unter dem primären Alltag-Umschalter.
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

// Meldet der Shell, dass eine Vollbild-Unteransicht (Event-Detail) offen ist —
// sie blendet dann Kopf + Segmente aus. Nur im eingebetteten Zustand relevant.
const emit = defineEmits<{ subview: [active: boolean] }>()

const router = useRouter()
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

// Überlebt den Android-Kaltstart. Event-Detail und die Monatsanalyse sind
// In-Page-Unteransichten ohne eigene Route.
type FinView = 'dashboard' | 'event' | 'analyse'
const finView = usePersistedRef<FinView>('finanzen.finView', 'dashboard', { ttlMs: DRAFT_TTL_MS })
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

// Event-Detail und Analyse sind Vollbild-Unteransichten — der Shell melden,
// damit sie Kopf + Segmentleiste ausblendet.
watch(finView, (v) => emit('subview', v !== 'dashboard'), { immediate: true })

function openEvent(eventId: string) {
  currentEventId.value = eventId
  finView.value = 'event'
}

function openAnalyse() { finView.value = 'analyse' }

function backToDashboard() {
  finView.value = 'dashboard'
  currentEventId.value = null
}

// Event-Detail und Analyse sind In-Page-Unteransichten ohne eigene Route —
// ohne das hier würde Android-Zurück aus ihnen heraus die App verlassen.
useBackDismiss(() => finView.value === 'event', backToDashboard)
useBackDismiss(() => finView.value === 'analyse', backToDashboard)

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
// die Unteransichten (Event-Detail, Analyse) nicht.
watch(finView, (v) => {
  setFabAction(v === 'dashboard' ? { label: 'Ausgabe erfassen', handler: openAddExpense } : null)
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

// Einstieg aus dem Wochen-Check-in (/finanzen?coach=settle). Query danach
// entfernen, sonst öffnet ein Zurück-Navigieren den Dialog erneut.
const route = useRoute()
watch(
  () => route.query.coach,
  (value) => {
    if (value !== 'settle') return
    onCoachAction('settleUp')
    // Nur coach entfernen — tab (Segment) muss erhalten bleiben, sonst springt
    // AlltagView zurück aufs erste Segment.
    const { coach, ...rest } = route.query
    router.replace({ path: route.path, query: rest })
  },
  { immediate: true }
)

// Der Coach schlägt vor, die App führt aus: die Aktion aus dem Bericht landet
// in genau den Flows, die es hier schon gibt. Der Coach schreibt selbst nichts.
function onCoachAction(action: CoachAction) {
  if (action === 'settleUp') {
    if (!openMonthlyExpenseIds.value.length) {
      showToast('Es steht gerade nichts offen')
      return
    }
    showSettle.value = true
    return
  }
  if (action === 'setBudget') router.push('/settings')
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

// ── Monatsfilter + Kürzung der Ausgabenliste ─────────────────
// Die Liste kann lang werden — deshalb je Monat filterbar und auf die letzten 8
// gekürzt, der Rest auf Tap. Monatschips aus den ohnehin berechneten
// financeMonths (absteigend, neuester zuerst); ohne aktive Wahl fällt es auf den
// neuesten Monat mit Ausgaben zurück.
const selectedExpenseMonth = ref<string | null>(null)
const activeExpenseMonth = computed(
  () => selectedExpenseMonth.value ?? financeMonths.value[0]?.monthKey ?? null
)
const monthExpenses = computed(() =>
  activeExpenseMonth.value
    ? sortedExpenses.value.filter(e => e.monthKey === activeExpenseMonth.value)
    : sortedExpenses.value
)

const EXPENSE_LIMIT = 8
const showAllExpenses = ref(false)
// Beim Monatswechsel wieder einklappen.
watch(activeExpenseMonth, () => { showAllExpenses.value = false })
const visibleExpenses = computed(() =>
  showAllExpenses.value ? monthExpenses.value : monthExpenses.value.slice(0, EXPENSE_LIMIT)
)
const hiddenExpenseCount = computed(() => Math.max(0, monthExpenses.value.length - EXPENSE_LIMIT))

const { justAdded: justAddedExpense } = useJustAdded(() => visibleExpenses.value, e => e.id)
</script>

<template>
  <div class="finanzen-page area-finanzen" :class="{ 'is-embedded': embedded }">
    <template v-if="finView === 'dashboard'">
      <!-- Header — nur eigenständig; eingebettet trägt AlltagView den Kopf. -->
      <div v-if="!embedded" class="page-header">
        <h1 class="page-title">Finanzen</h1>
        <ProfileButton />
      </div>

      <!-- Ein gescrollter Stapel, kein Segmentumschalter mehr: Saldo · Events ·
           Ausgaben, darunter der Einstieg in die Monatsanalyse. -->
      <div class="fin-scroll">
        <div class="uebersicht-pane rise-stagger">
          <BalanceCard
            :balanceInfo="balanceInfo"
            :couple="couple"
            :currentUserId="user?.uid ?? ''"
            @settle="showSettle = true"
          />

          <!-- Einstieg in die Monatsanalyse — präsent zwischen Saldo und Events. -->
          <button type="button" class="analyse-link" @click="openAnalyse">
            <span class="analyse-link__ico" aria-hidden="true">📊</span>
            <span class="analyse-link__text">Analyse<span>Monatsvergleich &amp; Kategorien</span></span>
            <span class="analyse-link__go" aria-hidden="true">›</span>
          </button>

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
          <template v-else>
            <!-- Monatsfilter -->
            <div v-if="financeMonths.length" class="expense-months" data-hswipe-skip>
              <button
                v-for="m in financeMonths"
                :key="m.monthKey"
                class="month-chip"
                :class="{ 'month-chip--active': m.monthKey === activeExpenseMonth }"
                @click="selectedExpenseMonth = m.monthKey"
              >{{ m.label }}</button>
            </div>

            <div v-if="monthExpenses.length === 0" class="empty-state">
              In diesem Monat keine Ausgaben.
            </div>
            <TransitionGroup v-else tag="div" name="list-add" class="expense-list">
              <ExpenseRow
                v-for="exp in visibleExpenses"
                :key="exp.id"
                :expense="exp"
                :couple="couple"
                :currentUserId="user?.uid ?? ''"
                :class="{ 'just-added': justAddedExpense.has(exp.id) }"
                @delete="onDeleteExpense"
                @edit="openEditExpense"
              />
            </TransitionGroup>

            <!-- Rest einblenden, damit die Liste nicht zu lang wird. -->
            <button
              v-if="hiddenExpenseCount > 0 && !showAllExpenses"
              type="button"
              class="more-expenses"
              @click="showAllExpenses = true"
            >Weitere Ausgaben anzeigen ({{ hiddenExpenseCount }})</button>
          </template>
        </div>
      </div>
    </template>

    <EventDetail
      v-else-if="finView === 'event' && currentEventSummary"
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

    <!-- Monatsanalyse als gestapelte Unteransicht (Zurück-Pfeil, kein FAB). -->
    <div v-else-if="finView === 'analyse'" class="analyse-sub">
      <div class="sub-head">
        <button type="button" class="sub-back" @click="backToDashboard" aria-label="Zurück">‹</button>
        <h1 class="sub-title">Analyse</h1>
      </div>
      <FinanzCoachView
        class="rise-stagger"
        :couple="couple"
        :months="financeMonths"
        :loading="loading"
      />
    </div>

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
      :addContext="finView === 'event' ? 'event' : 'dashboard'"
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

/* Gescrollter Stapel (Saldo · Events · Ausgaben · Analyse-Link) — kein
   Segmentumschalter mehr, seit Geld ein Alltag-Segment ist. */
.fin-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 4px;
}

.uebersicht-pane {
  padding-bottom: 8px;
}

/* Einstieg in die Monatsanalyse — präsent zwischen Saldo und Events, im
   Bereichs-Tint (türkis) statt neutral, damit er nicht wie eine Fußzeile wirkt. */
.analyse-link {
  display: flex;
  align-items: center;
  gap: 11px;
  width: calc(100% - 2 * var(--screen-pad));
  margin: 0 var(--screen-pad) 14px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: var(--radius-card);
  background: var(--accent-tint);
  cursor: pointer;
  text-align: left;
}
.analyse-link__ico {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-tile);
  display: grid;
  place-items: center;
  font-size: 17px;
  background: var(--surface);
}
.analyse-link__text {
  flex: 1;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.analyse-link__text span {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-meta);
  margin-top: 2px;
}
.analyse-link__go {
  font-size: 20px;
  color: var(--text-faint);
}

/* Kopf der gestapelten Analyse-Unteransicht (Zurück-Pfeil). */
.analyse-sub {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.sub-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px var(--screen-pad) 12px;
}
.sub-back {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  border: none;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  margin-right: 4px;
}
.sub-title {
  font-family: var(--font-headline);
  font-size: 22px;
  font-weight: 700;
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

/* Monatsfilter über der Ausgabenliste (Muster wie Verlauf/Analyse). */
.expense-months {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 0 var(--screen-pad) 12px;
}
.month-chip {
  flex: none;
  padding: 7px 13px;
  border: 1px solid var(--border-softer);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  color: var(--text-meta);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  text-transform: capitalize;
}
.month-chip--active {
  background: var(--accent-tint);
  border-color: var(--accent);
  color: var(--text);
}

/* „Weitere Ausgaben anzeigen" — dezent, gestrichelt, damit die Liste kurz bleibt. */
.more-expenses {
  display: block;
  margin: 12px auto 2px;
  padding: 9px 18px;
  border: 1px dashed var(--border);
  border-radius: 100px;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
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

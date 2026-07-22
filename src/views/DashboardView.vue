<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { useFavoriteChores } from '@/composables/useFavoriteChores'
import { useMealPlan } from '@/composables/useMealPlan'
import { useExpenses } from '@/composables/useExpenses'
import { useBelegung } from '@/composables/useBelegung'
import { useBucketList } from '@/composables/useBucketList'
import { usePlanung } from '@/composables/usePlanung'
import { useShopping } from '@/composables/useShopping'
import { showToast } from '@/composables/useToast'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { useCoach } from '@/composables/useCoach'
import { useCheckin, CHECKIN_RETENTION_DAYS } from '@/composables/useCheckin'
import { useAiThinking } from '@/composables/useAiThinking'
import { showPaywall } from '@/composables/usePaywall'
import { dateKey, weekRangeLabel, currentWeekDates } from '@/utils/mealplan'
import { resolveExpenseCategories } from '@/utils/expenseCategories'
import { resolveIdeaCategories } from '@/utils/ideen'
import { buildCoachSnapshot } from '@/utils/coachSnapshot'
import { mergeDigestsToTopics } from '@/utils/checkin'
import { buildMentalLoad } from '@/utils/mentalLoad'
import { buildTogetherStats } from '@/utils/togetherStats'
import type { Chore, ExpenseCategory } from '@/types'
import type { CoachAction } from '@/services/ai'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import MealHero from '@/components/dashboard/MealHero.vue'
import CoachCard from '@/components/dashboard/CoachCard.vue'
import CheckinCard from '@/components/dashboard/CheckinCard.vue'
import CheckinSheet from '@/components/dashboard/CheckinSheet.vue'
import MentalLoadCard from '@/components/dashboard/MentalLoadCard.vue'
import TogetherStatsCard from '@/components/dashboard/TogetherStatsCard.vue'
import OpenChoresCard from '@/components/dashboard/OpenChoresCard.vue'
import QuickTasksCard from '@/components/dashboard/QuickTasksCard.vue'
import BelegungTodayCard from '@/components/dashboard/BelegungTodayCard.vue'
import FinanceCard from '@/components/dashboard/FinanceCard.vue'
import TogetherSoonCard from '@/components/dashboard/TogetherSoonCard.vue'
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding.vue'
import AddExpenseSheet from '@/components/finance/AddExpenseSheet.vue'

const router = useRouter()
const { user } = useAuth()
const { couple, updateBudget, setCheckinConsent } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)
const currentUserId = computed(() => user.value?.uid ?? '')

const { chores, history, completeChore, reassignChore, loading: choresLoading } = useChores(coupleId)
const { myFavoriteChoreIds, loading: favLoading } = useFavoriteChores(coupleId)
const { week, mealEntries, loading: mealPlanLoading, setCookAssignee } = useMealPlan(coupleId)

// Meine favorisierten Chores, aufgelöst gegen den Pool (verwaiste Links, deren
// Chore gelöscht wurde, fallen dabei automatisch weg).
const favoriteChores = computed(() =>
  chores.value.filter((c) => myFavoriteChoreIds.value.has(c.id))
)
const {
  expenses, monthlySummaries, balanceInfo, financeMonths, activeEventSummaries,
  addExpense, createEvent,
  loading: expensesLoading,
} = useExpenses(coupleId)
const { bookings, resources, resourceById, loading: belegungLoading } = useBelegung(coupleId)
const { items: ideas, loading: ideasLoading } = useBucketList(coupleId)
// Nur für den Mental-Load-Index: `addedBy` sagt, wer bemerkt hat, dass etwas
// ausgeht — einer der stärksten Marker für unsichtbare Arbeit.
const { items: shoppingItems } = useShopping(coupleId)
const { trips, loading: tripsLoading } = usePlanung(coupleId)

const loading = computed(() =>
  choresLoading.value || favLoading.value || mealPlanLoading.value ||
  expensesLoading.value || belegungLoading.value || ideasLoading.value || tripsLoading.value
)

const dateLabel = computed(() =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
)

const greetingName = computed(() => {
  const name = couple.value?.memberNames[currentUserId.value]
  return name ? `Hallo ${name} 👋` : 'Moin, ihr zwei 👋'
})

// ── Fokus heute: Essen ─────────────────────────────────────────
const todayMeal = computed(() => {
  const key = dateKey(new Date())
  return week.value.find((d) => d.dateKey === key) ?? null
})

async function setCook(assignee: string) {
  if (!todayMeal.value?.entry) return
  const ok = await setCookAssignee(todayMeal.value.entry.id, assignee)
  if (!ok) showToast('Fehler beim Speichern')
}

// ── Schnell-Aufgaben (Verknüpfungen auf bestehende Chores) ─────
// Ein Tap erledigt den Chore ganz normal → Verlaufseintrag + Punkte.
async function tapQuickTask(chore: Chore) {
  const ok = await completeChore(chore, currentUserId.value)
  if (!ok) showToast('Fehler beim Speichern')
}

function goToQuickTaskSettings() {
  router.push('/settings/schnellaufgaben')
}

// Sich eine offene Aufgabe nehmen, statt sie zugewiesen zu bekommen.
async function claimChore(chore: Chore) {
  const ok = await reassignChore(chore.id, currentUserId.value)
  showToast(ok ? `„${chore.name}" gehört jetzt dir` : 'Fehler beim Speichern')
}

// ── Finanzen ───────────────────────────────────────────────────
const monthKey = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date())
)

const currentMonth = computed(() =>
  monthlySummaries.value.find((m) => m.monthKey === monthKey.value) ?? null
)

const currentMonthSpent = computed(() => currentMonth.value?.total ?? 0)
const budgetCents = computed(() => couple.value?.monthlyBudget ?? null)

// Offener Paar-Saldo (nur unbezahlte Monatsausgaben, über alle Monate).
const openBalance = computed(() => Math.abs(balanceInfo.value.balances[currentUserId.value] ?? 0))
const hasBudget = computed(() => budgetCents.value != null && budgetCents.value > 0)

// Finanz-Widget nur zeigen, wenn es etwas zu sagen hat: entweder ein Budget
// läuft, oder es steht ein Ausgleich offen (Fallback-Regel aus dem Handoff).
const showFinance = computed(() => hasBudget.value || openBalance.value > 0)

// ── Ausgabe erfassen (Sheet wie in der Finanzen-View) ──────────
// Offener Sheet überlebt den Android-Kaltstart (TTL); der Entwurf im Sheet
// selbst ist ebenfalls persistiert (AddExpenseSheet).
const showAddExpense = usePersistedRef('dashboard.showAddExpense', false, { ttlMs: DRAFT_TTL_MS })

async function onSubmitExpense(payload: {
  title: string
  amountInCents: number
  paidBy: string
  owedBy: Record<string, number>
  category: ExpenseCategory
}) {
  await addExpense({ ...payload, eventId: null })
  showAddExpense.value = false
  showToast('Ausgabe gespeichert')
}

async function onSubmitEvent(payload: { title: string; dateLabel: string }) {
  await createEvent(payload.title)
  showAddExpense.value = false
  showToast(`„${payload.title}" angelegt ✓`)
}

// ── Mental Load: wer denkt mit? ────────────────────────────────
// Rein gerechnet aus `createdBy`/`addedBy`/`suggestedBy` — keine KI, keine
// neue Erfassung. Misst bewusst etwas anderes als der Punktestand im Haushalt:
// nicht wer etwas GEMACHT hat, sondern wer gemerkt hat, dass es ansteht.
const mentalLoad = computed(() =>
  buildMentalLoad({
    couple: couple.value,
    viewerUid: currentUserId.value,
    chores: chores.value,
    shoppingItems: shoppingItems.value,
    bookings: bookings.value,
    ideas: ideas.value,
    mealEntries: mealEntries.value,
    expenses: expenses.value,
  })
)

// Kumulativer Rückblick — die einzige Zahl der App, die nicht zwischen den
// beiden unterscheidet.
const togetherStats = computed(() =>
  buildTogetherStats({
    couple: couple.value,
    history: history.value,
    mealEntries: mealEntries.value,
    ideas: ideas.value,
    trips: trips.value,
    bookings: bookings.value,
  })
)

// ── Check-in („Wie geht's dir gerade?") ────────────────────────
// Privat: der Listener sieht nur die EIGENEN Einträge; in den Coach-Bericht
// fließen die Themen beider Partner nur als anonymer Enum-Digest ein.
const {
  entries: checkinEntries,
  optedIn: checkinOptedIn,
  addEntry: addCheckinEntry,
  removeEntry: removeCheckinEntry,
  readCoupleDigests,
} = useCheckin(coupleId)

const showCheckinSheet = usePersistedRef('dashboard.showCheckin', false, { ttlMs: DRAFT_TTL_MS })

async function onCheckinConsent() {
  const ok = await setCheckinConsent(true)
  if (!ok) showToast('Konnte nicht gespeichert werden')
}

async function onCheckinSubmit(payload: Parameters<typeof addCheckinEntry>[0]) {
  const ok = await addCheckinEntry(payload)
  if (!ok) {
    showToast('Konnte nicht gespeichert werden')
    return
  }
  showCheckinSheet.value = false
  showToast('Gespeichert — nur für dich 🔒')
}

async function onCheckinRemove(id: string) {
  const ok = await removeCheckinEntry(id)
  if (!ok) showToast('Konnte nicht gelöscht werden')
}

// ── Wochen-Check-in (Paar-Coach) ───────────────────────────────
// Der Snapshot entsteht aus den Composables, die auf dieser Seite ohnehin schon
// laufen — es kommt kein einziger zusätzlicher Listener dazu.
const { currentReport, generateReport, loading: coachLoading } = useCoach(coupleId)
const { runTask, playBloom } = useAiThinking()
const coachThinking = ref(false)

const coachReport = computed(() => currentReport.value?.report ?? null)

// Nur nennen, wenn es der Partner war — "von dir" wäre eine Nullaussage.
const coachCreatedByName = computed(() => {
  const uid = currentReport.value?.createdBy
  if (!uid || uid === currentUserId.value) return null
  return couple.value?.memberNames[uid] ?? null
})

let coachToken = 0
function cancelCoach() {
  coachToken++
  coachThinking.value = false
}

async function startCoach() {
  if (coachThinking.value || !couple.value) return
  const token = ++coachToken
  coachThinking.value = true

  const outcome = await runTask(async () => {
    // Check-in-Themen beider Partner — einmalige Digest-Reads, anonym gemischt
    // (mergeDigestsToTopics), KEINE Namen. Der Freitext bleibt komplett außen
    // vor, bis die Cloud Functions ihn serverseitig einbeziehen (Phase 2b).
    const digests = await readCoupleDigests()
    const snapshot = buildCoachSnapshot({
      weekLabel: weekRangeLabel(currentWeekDates()),
      couple: couple.value,
      mentalLoad: mentalLoad.value,
      fairness: { couple: couple.value, chores: chores.value, history: history.value },
      money: {
        couple: couple.value,
        monthKey: monthKey.value,
        monthLabel: monthLabel.value,
        categories: resolveExpenseCategories(couple.value),
        month: financeMonths.value.find((m) => m.monthKey === monthKey.value) ?? null,
        summary: currentMonth.value,
        balance: balanceInfo.value,
        expenses: expenses.value,
        events: activeEventSummaries.value,
      },
      together: {
        couple: couple.value,
        ideas: ideas.value,
        ideaCategories: resolveIdeaCategories(couple.value),
        trips: trips.value,
        mealEntries: week.value.map((d) => d.entry),
      },
      checkin: { windowDays: CHECKIN_RETENTION_DAYS, topics: mergeDigestsToTopics(digests) },
    })
    return generateReport('week', snapshot)
  })

  if (token !== coachToken) return // abgebrochen → Ergebnis verwerfen
  if (outcome?.kind === 'ok') await playBloom()
  if (token !== coachToken) return
  coachThinking.value = false

  if (outcome?.kind === 'paywall') showPaywall('coach')
  else if (outcome?.kind === 'error') showToast(outcome.message)
  else if (!outcome) showToast('Check-in konnte nicht erstellt werden')
}

// Der Coach schlägt vor, die App führt aus — jede Aktion landet in einem Flow,
// den es schon gibt. Der Coach schreibt selbst nichts.
function onCoachAction(action: CoachAction) {
  if (action === 'rebalanceChores') router.push('/haushalt?coach=fair')
  else if (action === 'settleUp') router.push('/finanzen?coach=settle')
  else if (action === 'planIdea') router.push('/planung')
  else if (action === 'setBudget') openBudgetSheet()
}

// ── Navigation ─────────────────────────────────────────────────
function goToEssen() { router.push('/einkaufen') }
function goToPlanung() { router.push('/planung') }
function goToKalender() { router.push('/planung?tab=kalender') }
function goToFinanzen() { router.push('/finanzen') }

// ── Leerzustand: frisch angemeldetes Paar ──────────────────────
const isEmpty = computed(() =>
  !todayMeal.value?.recipe &&
  chores.value.length === 0 &&
  bookings.value.length === 0 &&
  resources.value.length === 0 &&
  expenses.value.length === 0 &&
  trips.value.length === 0 &&
  ideas.value.length === 0
)

// ── Budget festlegen (Onboarding-Schritt) ──────────────────────
const showBudgetSheet = usePersistedRef('dashboard.showBudgetSheet', false, { ttlMs: DRAFT_TTL_MS })
const budgetInput = usePersistedRef('dashboard.budgetInput', '', { ttlMs: DRAFT_TTL_MS })

function openBudgetSheet() {
  budgetInput.value = budgetCents.value ? (budgetCents.value / 100).toFixed(2) : ''
  showBudgetSheet.value = true
}

async function saveBudget() {
  const raw = budgetInput.value.trim().replace(',', '.')

  if (raw === '') {
    const ok = await updateBudget(null)
    showToast(ok ? 'Budget entfernt' : 'Fehler beim Speichern')
    if (ok) showBudgetSheet.value = false
    return
  }

  const euros = parseFloat(raw)
  if (isNaN(euros) || euros <= 0) {
    showToast('Bitte einen Betrag eingeben')
    return
  }

  const ok = await updateBudget(Math.round(euros * 100))
  showToast(ok ? 'Budget gespeichert' : 'Fehler beim Speichern')
  if (ok) showBudgetSheet.value = false
}
</script>

<template>
  <div class="dashboard-page area-dashboard">
    <div class="page-header">
      <div>
        <h1 class="greeting">{{ greetingName }}</h1>
        <span class="date-label">{{ dateLabel }}</span>
      </div>
      <ProfileButton :size="34" />
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>

    <div v-else class="dashboard-body rise-stagger">
      <DashboardOnboarding
        v-if="isEmpty"
        :hasMeal="false"
        :hasBelegung="false"
        :hasBudget="false"
        @meal="goToEssen"
        @belegung="goToPlanung"
        @budget="openBudgetSheet"
      />

      <template v-else>
        <!-- Fokus heute -->
        <MealHero
          :day="todayMeal"
          :couple="couple"
          :currentUserId="currentUserId"
          @setCook="setCook"
          @open="goToEssen"
        />

        <!-- Wer denkt mit: die unsichtbare Hälfte, direkt vor dem Check-in.
             Zeigt zuerst, was der Partner getragen hat — erst danach die Waage. -->
        <MentalLoadCard
          :summary="mentalLoad"
          :couple="couple"
          :currentUserId="currentUserId"
        />

        <!-- Wochen-Check-in: das Ritual gehört in die Fokus-Zone, direkt unter
             das Heute — nicht ans Seitenende zwischen die Regale. -->
        <CoachCard
          :report="coachReport"
          :thinking="coachThinking"
          :loading="coachLoading"
          :createdByName="coachCreatedByName"
          @generate="startCoach"
          @cancel="cancelCoach"
          @action="onCoachAction"
        />

        <!-- Der private Gegenpol zum geteilten Wochen-Check-in direkt darüber:
             was hier steht, sieht nur der Verfasser. -->
        <CheckinCard
          :entries="checkinEntries"
          :optedIn="checkinOptedIn"
          @open="showCheckinSheet = true"
          @remove="onCheckinRemove"
        />

        <!-- Offene Aufgaben zum Übernehmen. Erscheint nur bei der Person, die
             gerade weniger trägt — der anderen wäre es zusätzlicher Druck. -->
        <OpenChoresCard
          :chores="chores"
          :history="history"
          :couple="couple"
          :currentUserId="currentUserId"
          @claim="claimChore"
        />

        <!-- Meine Schnell-Aufgaben -->
        <div class="sec">
          <span class="sec-lab">Meine Schnell-Aufgaben</span>
          <button type="button" class="sec-act" @click="goToQuickTaskSettings">Bearbeiten</button>
        </div>
        <QuickTasksCard
          :chores="favoriteChores"
          :history="history"
          :currentUserId="currentUserId"
          @tap="tapQuickTask"
          @add="goToQuickTaskSettings"
        />

        <!-- Belegung heute -->
        <div class="sec">
          <span class="sec-lab">Belegung heute</span>
          <button type="button" class="sec-act" @click="goToKalender">Alle</button>
        </div>
        <BelegungTodayCard
          :bookings="bookings"
          :resourceById="resourceById"
          :couple="couple"
        />

        <!-- Finanzen -->
        <FinanceCard
          v-if="showFinance"
          :couple="couple"
          :currentUserId="currentUserId"
          :monthLabel="monthLabel"
          :spent="currentMonthSpent"
          :budget="budgetCents"
          :balances="balanceInfo.balances"
          @open="goToFinanzen"
          @addExpense="showAddExpense = true"
        />

        <!-- Gemeinsam bald -->
        <template v-if="trips.length || ideas.length">
          <div class="sec">
            <span class="sec-lab">Gemeinsam bald</span>
          </div>
          <TogetherSoonCard
            :couple="couple"
            :trips="trips"
            :ideas="ideas"
            @open="goToPlanung"
          />
        </template>

        <!-- Ganz unten: man scrollt an allem Heutigen vorbei und landet bei
             dem, was zu zweit entstanden ist. -->
        <TogetherStatsCard :stats="togetherStats" />
      </template>
    </div>

    <!-- Ausgabe erfassen -->
    <AddExpenseSheet
      :isOpen="showAddExpense"
      :couple="couple"
      :currentUserId="currentUserId"
      addContext="dashboard"
      persistKey="dashboard.expense"
      @close="showAddExpense = false"
      @submit="onSubmitExpense"
      @submitEvent="onSubmitEvent"
    />

    <!-- Check-in erfassen (Consent beim ersten Mal) -->
    <CheckinSheet
      :isOpen="showCheckinSheet"
      :optedIn="checkinOptedIn"
      @close="showCheckinSheet = false"
      @consent="onCheckinConsent"
      @submit="onCheckinSubmit"
    />

    <!-- Budget festlegen (Onboarding) -->
    <BottomSheet :isOpen="showBudgetSheet" title="Monatsbudget festlegen" @close="showBudgetSheet = false">
      <input
        v-model="budgetInput"
        class="app-field"
        type="text"
        inputmode="decimal"
        placeholder="z. B. 800"
        @keyup.enter="saveBudget"
      />
      <p class="sheet-hint">Leer lassen entfernt das Budget.</p>
      <button class="btn-primary" @click="saveBudget">Speichern</button>
    </BottomSheet>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: calc(var(--safe-top) + 20px) var(--screen-pad) 8px;
}

.greeting {
  font-family: var(--font-headline);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.date-label {
  display: block;
  margin-top: 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 18px;
  color: var(--text-faint);
  text-align: center;
}

.dashboard-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px var(--screen-pad) 24px;
}

/* Abschnittskopf mit Aktions-Link (reference/index.html .sec) */
.sec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px;
  margin-top: 6px;
}

.sec-lab {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-meta);
}

.sec-act {
  border: none;
  background: none;
  padding: 4px 6px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 800;
  color: var(--accent);
  cursor: pointer;
}

.sheet-hint {
  margin: 8px 0 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-meta);
}
</style>

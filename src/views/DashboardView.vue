<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { useFavoriteChores } from '@/composables/useFavoriteChores'
import { useMealPlan } from '@/composables/useMealPlan'
import { useExpenses } from '@/composables/useExpenses'
import { useBelegung } from '@/composables/useBelegung'
import { showToast } from '@/composables/useToast'
import { usePersistedRef, DRAFT_TTL_MS } from '@/composables/usePersistedRef'
import { useCheckin } from '@/composables/useCheckin'
import { dateKey } from '@/utils/mealplan'
import type { Chore, ExpenseCategory } from '@/types'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import MealHero from '@/components/dashboard/MealHero.vue'
import CheckinCard from '@/components/dashboard/CheckinCard.vue'
import CheckinSheet from '@/components/dashboard/CheckinSheet.vue'
import OpenChoresCard from '@/components/dashboard/OpenChoresCard.vue'
import QuickTasksCard from '@/components/dashboard/QuickTasksCard.vue'
import BelegungTodayCard from '@/components/dashboard/BelegungTodayCard.vue'
import FinanceCard from '@/components/dashboard/FinanceCard.vue'
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding.vue'
import AddExpenseSheet from '@/components/finance/AddExpenseSheet.vue'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { couple, updateBudget, setCheckinConsent } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)
const currentUserId = computed(() => user.value?.uid ?? '')

const { chores, history, completeChore, reassignChore, loading: choresLoading } = useChores(coupleId)
const { myFavoriteChoreIds, loading: favLoading } = useFavoriteChores(coupleId)
const { week, loading: mealPlanLoading, setCookAssignee } = useMealPlan(coupleId)

// Meine favorisierten Chores, aufgelöst gegen den Pool (verwaiste Links, deren
// Chore gelöscht wurde, fallen dabei automatisch weg).
const favoriteChores = computed(() =>
  chores.value.filter((c) => myFavoriteChoreIds.value.has(c.id))
)
const {
  expenses, monthlySummaries, balanceInfo,
  addExpense, createEvent,
  loading: expensesLoading,
} = useExpenses(coupleId)
const { bookings, resources, resourceById, loading: belegungLoading } = useBelegung(coupleId)

const loading = computed(() =>
  choresLoading.value || favLoading.value || mealPlanLoading.value ||
  expensesLoading.value || belegungLoading.value
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

// ── Check-in („Wie geht's dir gerade?") ────────────────────────
// Privat: der Listener sieht nur die EIGENEN Einträge; in den Coach-Bericht
// fließen die Themen beider Partner nur als anonymer Enum-Digest ein.
const {
  entries: checkinEntries,
  optedIn: checkinOptedIn,
  addEntry: addCheckinEntry,
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

// ── Navigation ─────────────────────────────────────────────────
function goToEssen() { router.push('/einkaufen') }
function goToPlanung() { router.push('/planung') }
function goToKalender() { router.push('/planung?tab=planung') }
function goToFinanzen() { router.push('/finanzen') }

// ── Leerzustand: frisch angemeldetes Paar ──────────────────────
// Ideen/Reisen zählen seit dem Wir-Umbau nicht mehr mit — deren Listener
// laufen hier gar nicht mehr, und ein Paar mit NUR einer Idee ist auf dem
// Start-Tab trotzdem „leer" genug für das Onboarding.
const isEmpty = computed(() =>
  !todayMeal.value?.recipe &&
  chores.value.length === 0 &&
  bookings.value.length === 0 &&
  resources.value.length === 0 &&
  expenses.value.length === 0
)

// ── Budget festlegen (Onboarding-Schritt) ──────────────────────
const showBudgetSheet = usePersistedRef('dashboard.showBudgetSheet', false, { ttlMs: DRAFT_TTL_MS })
const budgetInput = usePersistedRef('dashboard.budgetInput', '', { ttlMs: DRAFT_TTL_MS })

function openBudgetSheet() {
  budgetInput.value = budgetCents.value ? (budgetCents.value / 100).toFixed(2) : ''
  showBudgetSheet.value = true
}

// Coach-Aktion „Budget festlegen" aus dem Wir-Tab: gleiche Mechanik wie
// ?coach=fair im Haushalt — Query aufgreifen, ausführen, Query entfernen.
watch(() => route.query.coach, (v) => {
  if (v !== 'budget') return
  openBudgetSheet()
  router.replace({ query: { ...route.query, coach: undefined } })
}, { immediate: true })

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

        <!-- Check-in-Kurzzeile: ein Tap zum Eintragen; die volle Karte (Liste,
             Wochenbericht, Mental Load) wohnt im Wir-Tab. -->
        <CheckinCard
          compact
          :entries="checkinEntries"
          :optedIn="checkinOptedIn"
          @open="showCheckinSheet = true"
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
      areaClass="area-dashboard"
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

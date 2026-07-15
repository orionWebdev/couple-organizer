<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCouple } from '@/composables/useCouple'
import { useChores } from '@/composables/useChores'
import { useMealPlan } from '@/composables/useMealPlan'
import { useExpenses } from '@/composables/useExpenses'
import { useBelegung } from '@/composables/useBelegung'
import { showToast } from '@/composables/useToast'
import { isDoneToday } from '@/utils/chores'
import { dateKey } from '@/utils/mealplan'
import { mondayOf, addDays } from '@/utils/belegung'
import ProfileButton from '@/components/ui/ProfileButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import MealHero from '@/components/dashboard/MealHero.vue'
import FinanceGlanceCard from '@/components/dashboard/FinanceGlanceCard.vue'
import BelegungShelfCard from '@/components/dashboard/BelegungShelfCard.vue'
import HaushaltBalanceCard from '@/components/dashboard/HaushaltBalanceCard.vue'
import DashboardOnboarding from '@/components/dashboard/DashboardOnboarding.vue'

const router = useRouter()
const { user } = useAuth()
const { couple, updateBudget } = useCouple()
const coupleId = computed(() => user.value?.coupleId ?? null)

const { chores, history, loading: choresLoading, completeChore } = useChores(coupleId)
const { week, loading: mealPlanLoading, setCookAssignee } = useMealPlan(coupleId)
const {
  expenses, monthlySummaries, recentExpenses,
  loading: expensesLoading,
} = useExpenses(coupleId)
const { bookings, resources, resourceById, loading: belegungLoading } = useBelegung(coupleId)

const loading = computed(() =>
  choresLoading.value || mealPlanLoading.value || expensesLoading.value || belegungLoading.value
)

const dateLabel = computed(() =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
)

const members = computed(() => couple.value?.memberIds ?? [])

// ── Jetzt im Fokus: Essen heute ───────────────────────────────
const todayMeal = computed(() => {
  const key = dateKey(new Date())
  return week.value.find((d) => d.dateKey === key) ?? null
})

async function setCook(assignee: string) {
  if (!todayMeal.value?.entry) return
  const ok = await setCookAssignee(todayMeal.value.entry.id, assignee)
  if (!ok) showToast('Fehler beim Speichern')
}

function goToEssen() {
  router.push('/einkaufen')
}

function goToPlanung() {
  router.push('/planung')
}

function goToKalender() {
  router.push('/belegung')
}

// ── Finanzen ──────────────────────────────────────────────────
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

// Ausgegeben = alles, was der Monat gekostet hat. Ob die beiden sich
// untereinander schon ausgeglichen haben, ist eine andere Frage — die stellt
// die Finanzen-View — und darf diese Zahl nicht kleiner machen.
const currentMonthSpent = computed(() => currentMonth.value?.total ?? 0)
const currentMonthPaidBy = computed(() => currentMonth.value?.paidBy ?? {})

const budgetCents = computed(() => couple.value?.monthlyBudget ?? null)

const lastPayment = computed(() => {
  const e = recentExpenses.value[0]
  return e ? { by: e.paidBy, title: e.title, amount: e.amount } : null
})

// ── Haushalt: Fairness diese Woche ────────────────────────────
const weekCounts = computed(() => {
  const start = mondayOf(new Date()).getTime()
  const end = addDays(mondayOf(new Date()), 7).getTime()

  const counts: Record<string, number> = {}
  for (const uid of members.value) counts[uid] = 0

  for (const entry of history.value) {
    const at = entry.completedAt?.toMillis?.()
    if (at == null || at < start || at >= end) continue

    // Gemeinsam Erledigtes zählt für beide — sonst würde ein Paar, das alles
    // zusammen macht, dauerhaft als "unfair" dastehen.
    if (entry.completedBy === 'both') {
      for (const uid of members.value) counts[uid]++
    } else if (entry.completedBy && counts[entry.completedBy] != null) {
      counts[entry.completedBy]++
    }
  }
  return counts
})

const openChores = computed(() => chores.value.filter((c) => !isDoneToday(c)))
const nextChore = computed(() => openChores.value[0] ?? null)

async function completeNextChore() {
  const c = nextChore.value
  if (!c) return
  const ok = await completeChore(c, c.assignee ?? 'both')
  showToast(ok ? 'Erledigt ✓' : 'Fehler beim Speichern')
}

function goToHaushalt() {
  router.push('/haushalt')
}

function goToFinanzen() {
  router.push('/finanzen')
}

// ── Leerzustand: frisch angemeldetes Paar ─────────────────────
// Nur wenn es wirklich nichts zu zeigen gibt. Ein fehlendes Budget allein macht
// das Dashboard nicht leer — die Ausgaben stehen auch ohne eins in der Karte.
const isEmpty = computed(() =>
  !todayMeal.value?.recipe &&
  chores.value.length === 0 &&
  bookings.value.length === 0 &&
  resources.value.length === 0 &&
  expenses.value.length === 0
)

// ── Budget festlegen (lebt weiterhin nur hier) ────────────────
const showBudgetSheet = ref(false)
const budgetInput = ref('')

function openBudgetSheet() {
  budgetInput.value = budgetCents.value ? (budgetCents.value / 100).toFixed(2) : ''
  showBudgetSheet.value = true
}

// Ein leeres Feld entfernt das Budget bewusst; eine unlesbare Eingabe ist ein
// Fehler und darf nicht stillschweigend als "kein Budget" durchgehen — genau das
// passierte vorher bei "800,00" in einem <input type="number">, das die
// Kommazahl verwirft und einen leeren String liefert.
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
        <h1 class="greeting">Moin, ihr zwei 👋</h1>
        <span class="date-label">{{ dateLabel }}</span>
      </div>
      <ProfileButton :size="34" />
    </div>

    <div v-if="loading" class="loading-msg">Laden…</div>

    <div v-else class="dashboard-body">
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
        <div class="section-label">Jetzt im Fokus</div>
        <MealHero :day="todayMeal" :couple="couple" @setCook="setCook" @open="goToEssen" />

        <div class="section-label section-label--spaced">Auf einen Blick</div>
        <div class="glance">
          <FinanceGlanceCard
            :couple="couple"
            :monthLabel="monthLabel"
            :spent="currentMonthSpent"
            :budget="budgetCents"
            :paid="currentMonthPaidBy"
            :last="lastPayment"
            @open="goToFinanzen"
            @setBudget="openBudgetSheet"
          />
          <BelegungShelfCard
            :bookings="bookings"
            :resourceById="resourceById"
            :couple="couple"
            @open="goToKalender"
          />
          <HaushaltBalanceCard
            :couple="couple"
            :counts="weekCounts"
            :nextChore="nextChore"
            @open="goToHaushalt"
            @complete="completeNextChore"
          />
        </div>
      </template>
    </div>

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
  padding: 8px var(--screen-pad) 24px;
}

.section-label {
  margin: 0 0 9px;
}

.section-label--spaced {
  margin-top: 20px;
}

.glance {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sheet-hint {
  margin: 8px 0 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-meta);
}
</style>

// Die Erzeugungsseite des Wochen-Check-ins, herausgelöst aus DashboardView.
//
// Die Bericht-ANZEIGE ist billig (useCoach = ein Listener auf coachReports),
// die Bericht-ERZEUGUNG braucht dagegen die halbe App als Snapshot-Input.
// Dieses Composable instanziiert seine Domain-Composables deshalb selbst
// (Hausmuster „new instance per call site") und liefert nebenbei mentalLoad
// und togetherStats mit — die rechnen aus denselben Listenern.
//
// Genutzt vom Wir-Tab (PlanungView). Das Dashboard zeigt seit dem Wir-Umbau
// keinen Coach mehr.
import { ref, computed, type Ref } from 'vue'
import { useAuth } from './useAuth'
import { useCouple } from './useCouple'
import { useChores } from './useChores'
import { useMealPlan } from './useMealPlan'
import { useExpenses } from './useExpenses'
import { useBelegung } from './useBelegung'
import { useBucketList } from './useBucketList'
import { usePlanung } from './usePlanung'
import { useShopping } from './useShopping'
import { useCoach } from './useCoach'
import { useCheckin, CHECKIN_RETENTION_DAYS } from './useCheckin'
import { useAiThinking } from './useAiThinking'
import { showPaywall } from './usePaywall'
import { showToast } from './useToast'
import { weekRangeLabel, currentWeekDates } from '@/utils/mealplan'
import { resolveExpenseCategories } from '@/utils/expenseCategories'
import { resolveIdeaCategories } from '@/utils/ideen'
import { buildCoachSnapshot, buildCoachMetrics, buildFairnessSnapshot, buildMoneySnapshot } from '@/utils/coachSnapshot'
import type { CoachLens } from '@/services/ai'
import { mergeDigestsToTopics } from '@/utils/checkin'
import { buildMentalLoad } from '@/utils/mentalLoad'
import { buildTogetherStats } from '@/utils/togetherStats'

export function useCoachRun(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const { couple } = useCouple()
  const currentUserId = computed(() => user.value?.uid ?? '')

  const { chores, history } = useChores(coupleId)
  const { week, mealEntries } = useMealPlan(coupleId)
  const {
    expenses, monthlySummaries, balanceInfo, financeMonths, activeEventSummaries,
  } = useExpenses(coupleId)
  const { bookings } = useBelegung(coupleId)
  const { items: ideas } = useBucketList(coupleId)
  const { items: shoppingItems } = useShopping(coupleId)
  const { trips } = usePlanung(coupleId)
  const { readCoupleDigests } = useCheckin(coupleId)

  const {
    currentReport, currentFairnessReport, currentMoneyReport,
    generateReport, loading: coachLoading,
  } = useCoach(coupleId)
  const { runTask, playBloom } = useAiThinking()

  const monthKey = computed(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const monthLabel = computed(() =>
    new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(new Date())
  )

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

  // Bericht + Ersteller je Blickwinkel. Seit dem 3er-Umbau wohnen alle drei
  // Linsen (Woche · Fairness · Geld) im EINEN Coach im Wir-Tab — der frühere
  // FairnessCard (Haushalt) und der Coach-Teil von FinanzCoachView sind
  // aufgelöst.
  const reportDocFor = (lens: CoachLens) =>
    lens === 'fairness' ? currentFairnessReport.value
    : lens === 'money' ? currentMoneyReport.value
    : currentReport.value

  function coachReportFor(lens: CoachLens) {
    return reportDocFor(lens)?.report ?? null
  }

  // Die gespeicherten Slider-Kennzahlen des Berichts (aus dem Snapshot zum
  // Erzeugungszeitpunkt) — leer, solange kein Bericht dieser Linse vorliegt.
  function coachMetricsFor(lens: CoachLens) {
    return reportDocFor(lens)?.metrics ?? []
  }

  // Nur nennen, wenn es der Partner war — "von dir" wäre eine Nullaussage.
  function coachCreatedByNameFor(lens: CoachLens): string | null {
    const uid = reportDocFor(lens)?.createdBy
    if (!uid || uid === currentUserId.value) return null
    return couple.value?.memberNames[uid] ?? null
  }

  const coachThinking = ref(false)
  let coachToken = 0

  function cancelCoach() {
    coachToken++
    coachThinking.value = false
  }

  // Baut den blickwinkel-spezifischen Snapshot. Jede Linse bekommt genau die
  // Zahlen, über die sie sprechen darf (Coach-Regel 1: was nicht im Snapshot
  // steht, darf die KI nicht behaupten):
  //   week     → der kombinierte Snapshot inkl. Check-in-Themen
  //   fairness → nur die Lastverteilung (kein mentalLoad, keine Geldzahlen)
  //   money    → nur Budget/Split/Saldo
  async function buildSnapshotFor(lens: CoachLens): Promise<unknown> {
    if (lens === 'fairness') {
      return buildFairnessSnapshot({ couple: couple.value, chores: chores.value, history: history.value })
    }
    if (lens === 'money') {
      const currentMonth = monthlySummaries.value.find((m) => m.monthKey === monthKey.value) ?? null
      return buildMoneySnapshot({
        couple: couple.value,
        monthKey: monthKey.value,
        monthLabel: monthLabel.value,
        categories: resolveExpenseCategories(couple.value),
        month: financeMonths.value.find((m) => m.monthKey === monthKey.value) ?? null,
        summary: currentMonth,
        balance: balanceInfo.value,
        expenses: expenses.value,
        events: activeEventSummaries.value,
      })
    }
    // week: der volle Snapshot inkl. anonym gemischter Check-in-Themen beider
    // Partner (mergeDigestsToTopics, KEINE Namen). Der Freitext bleibt außen vor,
    // bis die Cloud Functions ihn serverseitig einbeziehen (Phase 2b).
    const digests = await readCoupleDigests()
    const currentMonth = monthlySummaries.value.find((m) => m.monthKey === monthKey.value) ?? null
    return buildCoachSnapshot({
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
        summary: currentMonth,
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
  }

  // Gibt den Ausgang zurück ('ok'|'paywall'|'error'|'cancelled'), damit ein
  // Aufrufer (KI-Hub) selbst reagieren kann. Fehler/Paywall behandelt die
  // Funktion weiterhin selbst (Toast/Paywall) — ein Erfolgs-Toast bleibt dem
  // Aufrufer überlassen, damit es keine Dopplung gibt.
  async function startCoach(lens: CoachLens = 'week'): Promise<'ok' | 'paywall' | 'error' | 'cancelled'> {
    if (coachThinking.value || !couple.value) return 'cancelled'
    const token = ++coachToken
    coachThinking.value = true

    const outcome = await runTask(async () => {
      const snapshot = await buildSnapshotFor(lens)
      // Kennzahlen aus DEMSELBEN Snapshot, den die KI sieht — so passen Slider
      // und Text garantiert zusammen.
      const metrics = buildCoachMetrics(lens, snapshot)
      return generateReport(lens, snapshot, metrics)
    })

    if (token !== coachToken) return 'cancelled' // abgebrochen → Ergebnis verwerfen
    if (outcome?.kind === 'ok') await playBloom()
    if (token !== coachToken) return 'cancelled'
    coachThinking.value = false

    if (outcome?.kind === 'paywall') { showPaywall('coach'); return 'paywall' }
    if (outcome?.kind === 'error') { showToast(outcome.message); return 'error' }
    if (!outcome) { showToast('Check-in konnte nicht erstellt werden'); return 'error' }
    return 'ok'
  }

  return {
    mentalLoad,
    togetherStats,
    coachReportFor,
    coachMetricsFor,
    coachCreatedByNameFor,
    coachLoading,
    coachThinking,
    startCoach,
    cancelCoach,
  }
}

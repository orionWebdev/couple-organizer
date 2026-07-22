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
import { buildCoachSnapshot } from '@/utils/coachSnapshot'
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

  const { currentReport, generateReport, loading: coachLoading } = useCoach(coupleId)
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

  const coachReport = computed(() => currentReport.value?.report ?? null)

  // Nur nennen, wenn es der Partner war — "von dir" wäre eine Nullaussage.
  const coachCreatedByName = computed(() => {
    const uid = currentReport.value?.createdBy
    if (!uid || uid === currentUserId.value) return null
    return couple.value?.memberNames[uid] ?? null
  })

  const coachThinking = ref(false)
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
      // Check-in-Themen beider Partner — einmalige Digest-Reads, anonym
      // gemischt (mergeDigestsToTopics), KEINE Namen. Der Freitext bleibt außen
      // vor, bis die Cloud Functions ihn serverseitig einbeziehen (Phase 2b).
      const digests = await readCoupleDigests()
      const currentMonth = monthlySummaries.value.find((m) => m.monthKey === monthKey.value) ?? null
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

  return {
    mentalLoad,
    togetherStats,
    coachReport,
    coachLoading,
    coachThinking,
    coachCreatedByName,
    startCoach,
    cancelCoach,
  }
}

// Der faktische Digest, den der Paar-Coach zu sehen bekommt — und das EINZIGE,
// woraus er seine Aussagen bilden darf.
//
// Reine Funktionen, wie choreBalance.ts und belegung.ts. Sie rechnen nichts neu,
// sondern verdichten die ohnehin schon berechneten Computeds der Composables zu
// einem kleinen, zahlenlastigen Objekt.
//
// Prinzip der ganzen Coach-Schicht: Zahlen aus dem Code, Worte aus der KI. Die
// UI rendert ihre Kennzahlen weiterhin selbst aus diesem Snapshot — die KI
// liefert nur die Deutung daneben. Was hier nicht drinsteht, kann die KI nicht
// wissen und darf sie folglich auch nicht behaupten.
import type {
  BucketListItem,
  Chore,
  ChoreHistoryEntry,
  Couple,
  Expense,
  ExpenseBalanceSummary,
  ExpenseCategoryDef,
  FinanceEventSummary,
  FinanceMonthComparison,
  IdeaCategoryDef,
  MealPlanEntry,
  MonthlyExpenseSummary,
  Trip
} from '@/types'
import type { MentalLoadSummary } from '@/utils/mentalLoad'
import type { CheckinTopic } from '@/utils/checkin'
import { categoryMeta } from '@/utils/expenseCategories'
import { recentPoints } from '@/utils/choreBalance'
import { roomLabel, roomOf } from '@/utils/rooms'
import { categoryDef } from '@/utils/ideen'

const MAX_CATEGORIES = 6
const MAX_EVENTS = 4
const MAX_IDEAS = 8
const MAX_TRIPS = 3
const MAX_ROOMS = 4
const FAIRNESS_WINDOW_DAYS = 14

export interface CoachPartner {
  uid: string
  name: string
}

export interface CoachMoney {
  monthLabel: string
  isCurrentMonth: boolean
  /** Was der Monat gekostet hat — ALLE Ausgaben, unabhängig von isPaid. */
  spentEuros: number
  budgetEuros: number | null
  budgetUsedPct: number | null
  /** Wie weit der Monat herum ist (nur beim laufenden Monat gesetzt). */
  monthElapsedPct: number | null
  /** Wer hat ausgelegt — ebenfalls ALLE Ausgaben. Die Fairness-Achse. */
  paidBy: { name: string; euros: number; sharePct: number }[]
  /** Offener Ausgleich ZWISCHEN den Partnern (nur unbezahlte Monatsausgaben). */
  openBalanceEuros: number
  openBalanceFrom: string | null
  openBalanceTo: string | null
  oldestOpenDays: number | null
  topCategories: { name: string; euros: number; deltaPct: number | null }[]
  events: { title: string; spentEuros: number; budgetEuros: number | null }[]
}

export interface CoachFairness {
  windowDays: number
  /** Punkte je Partner im Fenster. 'both' zählt für beide (Regel wie überall). */
  load: { name: string; points: number; sharePct: number }[]
  /** Wo die Last liegt — die stärksten Bereiche, je Partner aufgeschlüsselt. */
  topRooms: { room: string; byPartner: { name: string; points: number }[] }[]
  completions: number
  unassignedChores: number
  recurringChores: number
}

export interface CoachTogether {
  /** Kochtage der laufenden Woche und wer sie übernimmt. */
  mealDaysPlanned: number
  cookSplit: { name: string; days: number }[]
  /** Ideen, die noch offen sind — der Vorrat für "macht mal wieder was". */
  openIdeasCount: number
  openIdeas: { name: string; category: string }[]
  /** Wann habt ihr zuletzt eine Idee abgehakt? Der ehrlichste "zu zweit"-Marker. */
  daysSinceLastIdeaDone: number | null
  /** Schon terminiert: Ideen mit Datum und Reisen in der Zukunft. */
  nextPlannedTogether: string | null
  upcomingTrips: { title: string; when: string }[]
}

// Die unsichtbare Hälfte: wer merkt, dass etwas ansteht. Kommt aus
// mentalLoad.ts und wird hier nur flachgeklopft, damit der Prompt kurz bleibt.
export interface CoachMentalLoad {
  windowDays: number
  people: {
    name: string
    sharePct: number
    choresCreated: number
    shoppingNoticed: number
    calendarKeptForPartner: number
    ideasSuggested: number
    mealsPlanned: number
    expensesLogged: number
  }[]
}

// Die anonymisierten Check-in-Themen — bewusst OHNE Namen und ohne Pro-Kopf-
// Zahlen (beide Partner gemischt, siehe mergeDigestsToTopics in checkin.ts).
// Die Anti-Attribution beginnt im Snapshot: was hier keinen Namen trägt, KANN
// die KI keinem der beiden zuordnen.
export interface CoachCheckin {
  windowDays: number
  topics: CheckinTopic[]
}

export interface CoachSnapshot {
  weekLabel: string
  partners: string[]
  mentalLoad: CoachMentalLoad
  fairness: CoachFairness
  money: CoachMoney
  together: CoachTogether
  /** Nur gesetzt, wenn mindestens ein Partner Check-in nutzt und Themen hat. */
  checkin?: CoachCheckin
}

export function toCoachMentalLoad(summary: MentalLoadSummary): CoachMentalLoad {
  const at = (p: MentalLoadSummary['people'][number], key: string) =>
    p.contributions.find((c) => c.key === key)?.count ?? 0
  return {
    windowDays: summary.windowDays,
    people: summary.people.map((p) => ({
      name: p.name,
      sharePct: p.sharePct,
      choresCreated: at(p, 'chores'),
      shoppingNoticed: at(p, 'shopping'),
      calendarKeptForPartner: at(p, 'calendar'),
      ideasSuggested: at(p, 'ideas'),
      mealsPlanned: at(p, 'meals'),
      expensesLogged: at(p, 'money')
    }))
  }
}

function toEuros(cents: number): number {
  return Math.round(cents) / 100
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function daysSince(ms: number, now: Date): number {
  return Math.floor((now.getTime() - ms) / 86400000)
}

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    return (timestamp as { toMillis: () => number }).toMillis()
  }
  return 0
}

export function partnersOf(couple: Couple | null): CoachPartner[] {
  if (!couple) return []
  return couple.memberIds.map((uid) => ({ uid, name: couple.memberNames[uid] ?? 'Partner' }))
}

export interface MoneySnapshotInput {
  couple: Couple | null
  monthKey: string
  monthLabel: string
  categories: readonly ExpenseCategoryDef[]
  /** Kategorie-Vergleich des Monats (useExpenses.financeMonths). */
  month: FinanceMonthComparison | null
  /** Monatssummen (useExpenses.monthlySummaries) — total/paidBy/open. */
  summary: MonthlyExpenseSummary | null
  /** Offener Paar-Saldo über alle Monate (useExpenses.balanceInfo). */
  balance: ExpenseBalanceSummary
  /** Nur für "seit wann offen" — alle Ausgaben des Paares. */
  expenses: readonly Expense[]
  /** Laufende (nicht archivierte) Events (useExpenses.activeEventSummaries). */
  events: readonly FinanceEventSummary[]
  now?: Date
}

// ⚠️ Die Falle dieser Domäne (siehe CLAUDE.md → "Finance domain specifics"):
// `isPaid` sagt, ob die beiden sich UNTEREINANDER ausgeglichen haben — nicht,
// ob Geld ausgegeben wurde. Deshalb:
//   spentEuros / paidBy  → ALLE Ausgaben des Monats
//   openBalance          → NUR unbezahlte, dafür über alle Monate
// Beides zu vermischen ist der Fehler, den dieser Bereich immer wieder erzeugt.
export function buildMoneySnapshot(input: MoneySnapshotInput): CoachMoney {
  const now = input.now ?? new Date()
  const partners = partnersOf(input.couple)

  const spentCents = input.summary?.total ?? input.month?.total ?? 0
  const budgetCents = input.couple?.monthlyBudget ?? null

  // Wer hat den Monat ausgelegt (alle Ausgaben) → der Paar-Split.
  const paidByRaw = input.summary?.paidBy ?? {}
  const paidTotal = Object.values(paidByRaw).reduce((sum, cents) => sum + cents, 0)
  const paidBy = partners.map((p) => ({
    name: p.name,
    euros: toEuros(paidByRaw[p.uid] ?? 0),
    sharePct: paidTotal > 0 ? Math.round(((paidByRaw[p.uid] ?? 0) / paidTotal) * 100) : 0
  }))

  // Offener Ausgleich: positiver Saldo = hat mehr ausgelegt, bekommt also.
  const balances = input.balance.balances
  const creditor = partners.find((p) => (balances[p.uid] ?? 0) > 0) ?? null
  const debtor = partners.find((p) => (balances[p.uid] ?? 0) < 0) ?? null
  const openBalanceCents = creditor ? Math.abs(balances[creditor.uid] ?? 0) : 0

  // Seit wann steht der älteste offene Posten? Macht aus einer Zahl eine
  // Beobachtung ("seit sechs Wochen") — genau das, was die reine Summe nicht sagt.
  const openTimestamps = input.expenses
    .filter((e) => !e.isPaid)
    .map((e) => toMillis(e.createdAt))
    .filter((ms) => ms > 0)
  const oldestOpenDays = openTimestamps.length
    ? Math.floor((now.getTime() - Math.min(...openTimestamps)) / 86400000)
    : null

  const topCategories = [...(input.month?.categories ?? [])]
    .sort((a, b) => b.current - a.current)
    .slice(0, MAX_CATEGORIES)
    .map((c) => ({
      name: categoryMeta(input.categories, c.categoryId).name,
      euros: toEuros(c.current),
      deltaPct: c.deltaPct
    }))

  // Ein Event-Budget misst sich an `spent` (alles), nicht an `total` (offen) —
  // sonst fiele der Balken nach "Abschließen & Ausgleichen" auf null zurück.
  const events = input.events.slice(0, MAX_EVENTS).map((e) => ({
    title: e.event.title,
    spentEuros: toEuros(e.spent),
    budgetEuros: e.event.budget == null ? null : toEuros(e.event.budget)
  }))

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = input.monthKey === currentMonthKey
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  return {
    monthLabel: input.monthLabel,
    isCurrentMonth,
    spentEuros: toEuros(spentCents),
    budgetEuros: budgetCents == null ? null : toEuros(budgetCents),
    budgetUsedPct: budgetCents ? Math.round((spentCents / budgetCents) * 100) : null,
    monthElapsedPct: isCurrentMonth ? Math.round((now.getDate() / daysInMonth) * 100) : null,
    paidBy,
    openBalanceEuros: toEuros(openBalanceCents),
    openBalanceFrom: openBalanceCents > 0 ? debtor?.name ?? null : null,
    openBalanceTo: openBalanceCents > 0 ? creditor?.name ?? null : null,
    oldestOpenDays: openBalanceCents > 0 ? oldestOpenDays : null,
    topCategories,
    events
  }
}

export interface FairnessSnapshotInput {
  couple: Couple | null
  chores: readonly Chore[]
  history: readonly ChoreHistoryEntry[]
  now?: Date
}

// Nutzt recentPoints() aus choreBalance.ts unverändert weiter — inklusive der
// 'both'-Regel, die eine gemeinsam erledigte Aufgabe BEIDEN gutschreibt. Ohne
// die sähe ein Paar, das alles zusammen macht, dauerhaft "unfair" aus.
export function buildFairnessSnapshot(input: FairnessSnapshotInput): CoachFairness {
  const now = input.now ?? new Date()
  const partners = partnersOf(input.couple)
  const uids = partners.map((p) => p.uid)

  const points = uids.length === 2 ? recentPoints(input.history, uids, FAIRNESS_WINDOW_DAYS) : {}
  const total = Object.values(points).reduce((sum, n) => sum + n, 0)

  const cutoff = now.getTime() - FAIRNESS_WINDOW_DAYS * 86400000
  const inWindow = input.history.filter((h) => toMillis(h.completedAt) >= cutoff)

  // Last je Bereich: welcher Raum trägt wie viel, und von wem. Das macht aus
  // "einer macht mehr" ein "einer macht die Küche" — deutlich anschlussfähiger.
  const choreById = new Map(input.chores.map((c) => [c.id, c]))
  const byRoom = new Map<string, Record<string, number>>()
  for (const h of inWindow) {
    const chore = choreById.get(h.choreId)
    const room = roomLabel(chore ? roomOf(chore) : 'allgemein')
    const row = byRoom.get(room) ?? {}
    for (const uid of uids) {
      if (h.completedBy === 'both' || h.completedBy === uid) {
        row[uid] = (row[uid] ?? 0) + h.points
      }
    }
    byRoom.set(room, row)
  }

  const topRooms = [...byRoom.entries()]
    .map(([room, row]) => ({
      room,
      sum: Object.values(row).reduce((s, n) => s + n, 0),
      byPartner: partners.map((p) => ({ name: p.name, points: row[p.uid] ?? 0 }))
    }))
    .sort((a, b) => b.sum - a.sum)
    .slice(0, MAX_ROOMS)
    .map(({ room, byPartner }) => ({ room, byPartner }))

  const active = input.chores.filter((c) => !(c.type === 'once' && c.done))

  return {
    windowDays: FAIRNESS_WINDOW_DAYS,
    load: partners.map((p) => ({
      name: p.name,
      points: points[p.uid] ?? 0,
      sharePct: pct(points[p.uid] ?? 0, total)
    })),
    topRooms,
    completions: inWindow.length,
    unassignedChores: active.filter((c) => c.assignee === null).length,
    recurringChores: active.filter((c) => c.type === 'recurring').length
  }
}

export interface TogetherSnapshotInput {
  couple: Couple | null
  ideas: readonly BucketListItem[]
  ideaCategories: readonly IdeaCategoryDef[]
  trips: readonly Trip[]
  /** Die Einträge der laufenden Woche (useMealPlan.week → entry). */
  mealEntries: readonly (MealPlanEntry | null)[]
  now?: Date
}

export function buildTogetherSnapshot(input: TogetherSnapshotInput): CoachTogether {
  const now = input.now ?? new Date()
  const partners = partnersOf(input.couple)
  const todayKey = dateKeyOf(now)

  const entries = input.mealEntries.filter((e): e is MealPlanEntry => !!e)
  const cookSplit = partners.map((p) => ({
    name: p.name,
    days: entries.filter((e) => e.cookAssignee === p.uid || e.cookAssignee === 'both').length
  }))

  const open = input.ideas.filter((i) => !i.done)
  const doneMs = input.ideas.filter((i) => i.done).map((i) => toMillis(i.updatedAt)).filter((ms) => ms > 0)

  // Alles, was schon einen Termin in der Zukunft hat — Idee mit Datum oder Reise.
  const plannedKeys = [
    ...input.ideas.map((i) => (!i.done ? i.date ?? null : null)),
    ...input.trips.map((t) => t.startDate ?? null)
  ].filter((k): k is string => !!k && k >= todayKey).sort()

  return {
    mealDaysPlanned: entries.length,
    cookSplit,
    openIdeasCount: open.length,
    openIdeas: open.slice(0, MAX_IDEAS).map((i) => ({
      name: i.name,
      category: categoryDef(i.category, input.ideaCategories).label
    })),
    daysSinceLastIdeaDone: doneMs.length ? daysSince(Math.max(...doneMs), now) : null,
    nextPlannedTogether: plannedKeys[0] ?? null,
    upcomingTrips: input.trips
      .filter((t) => !t.startDate || t.startDate >= todayKey)
      .slice(0, MAX_TRIPS)
      .map((t) => ({ title: t.title, when: t.startDate ?? t.when }))
  }
}

function dateKeyOf(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

// Der komplette Snapshot fürs Wochen-Check-in — die drei Abschnitte in einem
// Objekt. Die Einzel-Builder bleiben exportiert, weil der Finanz-Tab nur den
// money-Teil braucht und nicht die halbe App als Eingabe haben soll.
export function buildCoachSnapshot(input: {
  weekLabel: string
  couple: Couple | null
  mentalLoad: MentalLoadSummary
  fairness: FairnessSnapshotInput
  money: MoneySnapshotInput
  together: TogetherSnapshotInput
  /** Anonymisierte Check-in-Themen (mergeDigestsToTopics) — optional. */
  checkin?: CoachCheckin | null
}): CoachSnapshot {
  const base: CoachSnapshot = {
    weekLabel: input.weekLabel,
    partners: partnersOf(input.couple).map((p) => p.name),
    mentalLoad: toCoachMentalLoad(input.mentalLoad),
    fairness: buildFairnessSnapshot(input.fairness),
    money: buildMoneySnapshot(input.money),
    together: buildTogetherSnapshot(input.together)
  }
  // Leere Themenliste gar nicht erst mitschicken — Coach-Regel 1 ("was nicht
  // dasteht, nicht erwähnen") soll greifen, nicht ein leeres Array erklären.
  if (input.checkin && input.checkin.topics.length > 0) base.checkin = input.checkin
  return base
}

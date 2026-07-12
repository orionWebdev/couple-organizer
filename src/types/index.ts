import type { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  email: string
  displayName: string
  coupleId: string | null
  notifyPush?: boolean // optional — absent on older user docs, defaults to true (see useAuth)
  languageEnglish?: boolean // rein visuell/Beta, kein echtes i18n dahinter
  createdAt: Timestamp
}

export interface ExpenseCategoryDef {
  id: string
  name: string
  icon: string
}

export interface Couple {
  id: string
  memberIds: string[]
  memberNames: Record<string, string> // { uid: displayName }
  memberIcons?: Record<string, string> // { uid: emoji } — optional, absent = Initialen-Fallback
  inviteCode: string
  monthlyBudget?: number | null // cents; optional — absent on older couple docs
  expenseCategories?: ExpenseCategoryDef[] // optional — absent = DEFAULT_EXPENSE_CATEGORIES (src/utils/expenseCategories.ts)
  createdAt: Timestamp
}

export type ChoreType = 'recurring' | 'once'
export type ChoreAssignee = string | 'both' | null // uid | Beide | Offen

// Punkte je Aufgabengröße: 5 = winzig, 10 = klein, 20 = mittel, 30 = groß.
export type ChorePoints = 5 | 10 | 20 | 30

// Feste Aufgabenbereiche/Räume für Pool-Filter und Zuordnung.
export type ChoreRoom =
  | 'allgemein'
  | 'kueche'
  | 'wohnzimmer'
  | 'schlafzimmer'
  | 'badezimmer'
  | 'waesche'
  | 'muell'
  | 'einkaufen'
  | 'pflanzen'
  | 'haustiere'
  | 'auto'

export interface Chore {
  id: string
  coupleId: string
  name: string
  room: ChoreRoom // Raum/Bereich für Filter (Altbestand ohne Feld = 'allgemein')
  type: ChoreType
  assignee: ChoreAssignee
  points: ChorePoints // Belohnungspunkte je nach Aufgabengröße (Altbestand: via pointsForChore abgeleitet)
  done: boolean // once-tasks only: permanently done, hides from pool
  completedAt: Timestamp | null // last completion instant (recurring: today's occurrence)
  completedBy: ChoreAssignee
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ChoreHistoryEntry {
  id: string
  coupleId: string
  choreId: string
  choreName: string
  completedBy: ChoreAssignee
  points: ChorePoints // beim Erledigen gutgeschriebene Punkte (Altbestand: via pointsForName abgeleitet)
  completedAt: Timestamp
  createdAt: Timestamp
}

export interface ShoppingItem {
  id: string
  coupleId: string
  listId: string
  name: string
  amount?: number
  unit?: string
  category: string
  checked: boolean
  checkedBy: string | null
  addedBy: string
  source: 'manual' | 'mealPlan'
  sourceWeekKey: string | null
  expenseId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ShoppingList {
  id: string
  coupleId: string
  title: string
  archived: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RecipeIngredient {
  name: string
  amount?: number
  unit?: string
}

export interface RecipeNutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Recipe {
  id: string
  coupleId: string
  title: string
  description: string
  minutes: number | null
  servings: number | null
  tags: readonly string[]
  ingredients: readonly RecipeIngredient[]
  steps: readonly string[]
  nutrition: RecipeNutrition | null
  source: 'manual' | 'ai'
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MealPlanEntry {
  id: string
  coupleId: string
  dateKey: string // YYYY-MM-DD, der geplante Kalendertag
  recipeId: string
  cookAssignee?: string | 'both' | null // wer kocht — optional, absent auf älteren Einträgen
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// String statt festem Union: Kategorien sind jetzt pro Couple frei editierbar
// (Couple.expenseCategories) — die bisherigen 5 Werte bleiben als IDs gültig.
export type ExpenseCategory = string
export type FinanceEventKind = 'event' | 'monthly'

export interface FinanceEvent {
  id: string
  coupleId: string
  title: string
  kind: FinanceEventKind
  category: ExpenseCategory | null
  archived: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  archivedAt: Timestamp | null
}

export interface Expense {
  id: string
  coupleId: string
  title: string
  amount: number // stored in cents
  owedBy: Readonly<Record<string, number>>
  category: ExpenseCategory
  paidBy: string
  eventId: string | null
  monthKey: string // YYYY-MM
  source: 'manual' | 'shopping'
  shoppingListId: string | null
  shoppingItemIds: readonly string[]
  isPaid: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ExpenseBalanceSummary {
  totals: Record<string, number>
  owedTotals: Record<string, number>
  balances: Record<string, number>
  totalSpent: number
}

export interface MonthlyExpenseSummary {
  monthKey: string
  total: number
  balances: Record<string, number>
  expenses: Expense[]
}

export interface FinanceEventSummary {
  event: FinanceEvent
  total: number
  balances: Record<string, number>
  expenses: Expense[]
}

export interface CategoryMonthlyComparison {
  categoryId: string
  current: number // cents, aktueller Monat
  previous: number // cents, Vormonat
  deltaPct: number | null // null wenn Vormonat 0 war (Prozent nicht sinnvoll berechenbar)
}

// Ein Monat im Finanz-Coach: alle Kategorie-Ausgaben dieses Monats plus
// Vergleich zum jeweils vorigen Kalendermonat. Es gibt einen Eintrag pro
// Monat, in dem überhaupt (Monats-)Ausgaben erfasst wurden.
export interface FinanceMonthComparison {
  monthKey: string // "YYYY-MM"
  label: string // z. B. "März 2026"
  total: number // cents, Summe aller Kategorien dieses Monats
  categories: CategoryMonthlyComparison[]
}

// ── Belegung: geteilte Ressourcen (Auto, E-Bike, Hund …) ─────────
export interface Resource {
  id: string
  coupleId: string
  name: string
  emoji: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type BookingRepeat = 'none' | 'weekly'

// Eine Belegung wird direkt eingetragen — es gibt keinen Anfrage-/Bestätigen-
// Flow (bewusst entfernt). Überschneidungen werden nur angezeigt, nie verhindert.
export interface Booking {
  id: string
  coupleId: string
  resourceId: string
  owner: string // uid — für wen die Belegung ist (kann der Partner sein)
  date: string // YYYY-MM-DD; bei repeat 'weekly' der erste Termin der Serie
  weekday: number // 0 = Montag … 6 = Sonntag, aus `date` abgeleitet
  allDay: boolean
  start: string // HH:MM
  end: string // HH:MM
  repeat: BookingRepeat
  note: string
  createdBy: string // uid — wer sie eingetragen hat (für die Übersicht)
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Eine Belegung an einem konkreten Tag. Wöchentliche Serien haben pro Woche
// eine Occurrence, liegen in Firestore aber nur als ein Booking-Dokument.
export interface BookingOccurrence {
  booking: Booking
  dateKey: string
}

export type BucketListCategory = 'ort' | 'restaurant'

export interface BucketListItem {
  id: string
  coupleId: string
  category: BucketListCategory
  name: string
  note: string
  done: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

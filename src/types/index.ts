import type { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  email: string
  displayName: string
  coupleId: string | null
  createdAt: Timestamp
}

export interface Couple {
  id: string
  memberIds: string[]
  memberNames: Record<string, string> // { uid: displayName }
  inviteCode: string
  createdAt: Timestamp
}

export type ChoreType = 'recurring' | 'once'
export type ChoreInterval = 'täglich' | 'wöchentlich' | 'monatlich'
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
  interval: ChoreInterval | null // only set when type === 'recurring'
  dueDate: Timestamp | null // null = kein fester Tag; same day = heute; future = demnächst
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

export type ExpenseCategory = 'food' | 'transport' | 'home' | 'leisure' | 'other'
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

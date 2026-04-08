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

export type TodoCategory = 'haushalt' | 'einkauf' | 'sonstiges'

export interface Todo {
  id: string
  coupleId: string
  title: string
  done: boolean
  assignedTo: string | null
  createdBy: string
  category: TodoCategory | null
  dueDate: Timestamp | null
  recurring: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
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

export interface ShoppingSession {
  id: string
  coupleId: string
  listId: string
  participants: string[]
  active: boolean
  createdBy: string
  createdAt: Timestamp
  endedAt: Timestamp | null
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

export type RecipeCategoryColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'pink' | 'teal'

export interface RecipeCategory {
  id: string
  coupleId: string
  name: string
  color: RecipeCategoryColor
  icon?: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RecipeIngredient {
  name: string
  amount: number
  unit: string
}

export interface Recipe {
  id: string
  coupleId: string
  title: string
  ingredients: ReadonlyArray<RecipeIngredient>
  instructions: string
  categories: ReadonlyArray<string> // category IDs
  image?: string // optional image URL
  isFavorite: boolean
  cookingTime?: number // minutes
  lastUsedAt?: Timestamp
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type MealPlanDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface MealPlanDayMeals {
  breakfast: string | null
  lunch: string | null
  dinner: string | null
}

export type MealPlanDays = Record<MealPlanDayKey, MealPlanDayMeals>

export interface MealPlan {
  id: string
  coupleId: string
  weekKey: string // YYYY-MM-DD (Montag)
  days: MealPlanDays
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

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

export interface Todo {
  id: string
  coupleId: string
  title: string
  done: boolean
  assignedTo: string | null
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ShoppingItem {
  id: string
  coupleId: string
  listId: string
  name: string
  category: string
  checked: boolean
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
  amount: number
  unit: string
}

export interface Recipe {
  id: string
  coupleId: string
  title: string
  ingredients: RecipeIngredient[]
  instructions: string
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

export type MealPlanDays = Record<MealPlanDayKey, string | null>

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
export type FinanceEventKind = 'one_time' | 'monthly'

export interface FinanceEvent {
  id: string
  coupleId: string
  title: string
  kind: FinanceEventKind
  category: ExpenseCategory | null
  archived: boolean
  settledAt: Timestamp | null
  settledBy: string | null
  settledMonthKeys: string[]
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

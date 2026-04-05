import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Expense, ExpenseCategory, FinanceEvent } from '@/types'

interface AddExpenseInput {
  title: string
  amountInCents: number
  paidBy: string
  category: ExpenseCategory
  eventId?: string | null
  source?: 'manual' | 'shopping'
  shoppingListId?: string | null
  shoppingItemIds?: string[]
}

interface MonthlyFoodSummary {
  monthKey: string
  total: number
  perPerson: number
}

interface EventSummary {
  event: FinanceEvent
  total: number
  perPerson: number
  expenses: Expense[]
}

function createMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp && typeof (timestamp as any).toMillis === 'function') {
    return (timestamp as any).toMillis()
  }
  return 0
}

function mapExpense(data: Record<string, any>, id: string): Expense {
  return {
    id,
    coupleId: data.coupleId,
    title: data.title || '',
    amount: data.amount || 0,
    category: data.category || 'other',
    paidBy: data.paidBy || '',
    eventId: data.eventId ?? null,
    monthKey: data.monthKey || createMonthKey(new Date()),
    source: data.source || 'manual',
    shoppingListId: data.shoppingListId ?? null,
    shoppingItemIds: Array.isArray(data.shoppingItemIds) ? data.shoppingItemIds : [],
    createdBy: data.createdBy || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt
  }
}

function mapFinanceEvent(data: Record<string, any>, id: string): FinanceEvent {
  return {
    id,
    coupleId: data.coupleId,
    title: data.title || '',
    archived: data.archived ?? false,
    createdBy: data.createdBy || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt,
    archivedAt: data.archivedAt ?? null
  }
}

export function useExpenses(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const expenses = ref<Expense[]>([])
  const events = ref<FinanceEvent[]>([])
  const loadingExpenses = ref(true)
  const loadingEvents = ref(true)
  const error = ref<string | null>(null)
  let unsubscribeExpenses: (() => void) | null = null
  let unsubscribeEvents: (() => void) | null = null

  const loading = computed(() => loadingExpenses.value || loadingEvents.value)

  function startListeningToExpenses(id: string) {
    if (unsubscribeExpenses) unsubscribeExpenses()
    loadingExpenses.value = true
    error.value = null

    const q = query(
      collection(db, 'expenses'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribeExpenses = onSnapshot(
      q,
      (snap) => {
        expenses.value = snap.docs.map((expenseDoc) => mapExpense(expenseDoc.data(), expenseDoc.id))
        loadingExpenses.value = false
      },
      (err) => {
        console.error('Expenses listener error:', err)
        error.value = err.message
        loadingExpenses.value = false
      }
    )
  }

  function startListeningToEvents(id: string) {
    if (unsubscribeEvents) unsubscribeEvents()
    loadingEvents.value = true
    error.value = null

    const q = query(
      collection(db, 'financeEvents'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribeEvents = onSnapshot(
      q,
      (snap) => {
        events.value = snap.docs.map((eventDoc) => mapFinanceEvent(eventDoc.data(), eventDoc.id))
        loadingEvents.value = false
      },
      (err) => {
        console.error('Finance events listener error:', err)
        error.value = err.message
        loadingEvents.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      expenses.value = []
      events.value = []
      loadingExpenses.value = false
      loadingEvents.value = false
      return
    }

    startListeningToExpenses(id)
    startListeningToEvents(id)
  }, { immediate: true })

  const balanceInfo = computed(() => {
    const totals: Record<string, number> = {}
    for (const exp of expenses.value) {
      totals[exp.paidBy] = (totals[exp.paidBy] || 0) + exp.amount
    }

    const uids = Object.keys(totals)
    const totalSpent = Object.values(totals).reduce((a, b) => a + b, 0)
    const fairShare = totalSpent / 2

    const balances: Record<string, number> = {}
    for (const uid of uids) {
      balances[uid] = (totals[uid] || 0) - fairShare
    }

    return { totals, balances, totalSpent }
  })

  const monthlyFoodSummaries = computed<MonthlyFoodSummary[]>(() => {
    const byMonth = new Map<string, number>()
    for (const expense of expenses.value) {
      if (expense.category !== 'food') continue
      if (expense.eventId) continue
      byMonth.set(expense.monthKey, (byMonth.get(expense.monthKey) || 0) + expense.amount)
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([monthKey, total]) => ({
        monthKey,
        total,
        perPerson: total / 2
      }))
  })

  const activeEvents = computed(() => events.value.filter((event) => !event.archived))
  const archivedEvents = computed(() => events.value.filter((event) => event.archived))

  const eventSummaries = computed<EventSummary[]>(() => {
    return events.value.map((event) => {
      const eventExpenses = expenses.value
        .filter((expense) => expense.eventId === event.id)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

      const total = eventExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      return {
        event,
        total,
        perPerson: total / 2,
        expenses: eventExpenses
      }
    })
  })

  async function addExpense(input: AddExpenseInput): Promise<string | null> {
    if (!coupleId.value || !user.value) return null

    const cleanTitle = input.title.trim()
    if (!cleanTitle || input.amountInCents <= 0 || !input.paidBy) return null

    const payload = {
      coupleId: coupleId.value,
      title: cleanTitle,
      amount: input.amountInCents,
      category: input.category,
      paidBy: input.paidBy,
      eventId: input.eventId ?? null,
      monthKey: createMonthKey(new Date()),
      source: input.source ?? 'manual',
      shoppingListId: input.shoppingListId ?? null,
      shoppingItemIds: input.shoppingItemIds ?? [],
      createdBy: user.value.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      const shoppingItemIds = input.shoppingItemIds ?? []

      if (shoppingItemIds.length > 0) {
        const expenseRef = doc(collection(db, 'expenses'))
        const batch = writeBatch(db)

        batch.set(expenseRef, payload)
        for (const shoppingItemId of shoppingItemIds) {
          batch.update(doc(db, 'shoppingItems', shoppingItemId), {
            checked: true,
            expenseId: expenseRef.id,
            updatedAt: serverTimestamp()
          })
        }

        await batch.commit()
        return expenseRef.id
      }

      const expenseRef = await addDoc(collection(db, 'expenses'), payload)
      return expenseRef.id
    } catch (err: any) {
      console.error('Failed to add expense:', err)
      error.value = err.message
      return null
    }
  }

  async function deleteExpense(id: string) {
    try {
      await deleteDoc(doc(db, 'expenses', id))
    } catch (err: any) {
      console.error('Failed to delete expense:', err)
      error.value = err.message
    }
  }

  async function createEvent(title: string) {
    if (!coupleId.value || !user.value) return
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    try {
      await addDoc(collection(db, 'financeEvents'), {
        coupleId: coupleId.value,
        title: cleanTitle,
        archived: false,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        archivedAt: null
      })
    } catch (err: any) {
      console.error('Failed to create finance event:', err)
      error.value = err.message
    }
  }

  async function setEventArchived(eventId: string, archived: boolean) {
    try {
      await updateDoc(doc(db, 'financeEvents', eventId), {
        archived,
        archivedAt: archived ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to archive finance event:', err)
      error.value = err.message
    }
  }

  onScopeDispose(() => {
    if (unsubscribeExpenses) unsubscribeExpenses()
    if (unsubscribeEvents) unsubscribeEvents()
  })

  return {
    expenses: readonly(expenses),
    events: readonly(events),
    activeEvents,
    archivedEvents,
    loading,
    error: readonly(error),
    balanceInfo,
    monthlyFoodSummaries,
    eventSummaries,
    addExpense,
    deleteExpense,
    createEvent,
    setEventArchived
  }
}

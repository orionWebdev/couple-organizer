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
import type {
  Expense,
  ExpenseBalanceSummary,
  ExpenseCategory,
  FinanceEvent,
  FinanceEventKind,
  FinanceEventSummary,
  MonthlyExpenseSummary
} from '@/types'

interface AddExpenseInput {
  title: string
  amountInCents: number
  paidBy: string
  owedBy?: Record<string, number>
  category: ExpenseCategory
  eventId?: string | null
  source?: 'manual' | 'shopping'
  shoppingListId?: string | null
  shoppingItemIds?: string[]
}

interface UpdateExpenseInput {
  title: string
  amountInCents: number
  paidBy: string
  owedBy?: Record<string, number>
  category: ExpenseCategory
  eventId?: string | null
}

function createMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

function toMillis(timestamp: unknown): number {
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp && typeof (timestamp as { toMillis: () => number }).toMillis === 'function') {
    return (timestamp as { toMillis: () => number }).toMillis()
  }

  return 0
}

function mapExpense(data: Record<string, any>, id: string): Expense {
  return {
    id,
    coupleId: data.coupleId,
    title: data.title || '',
    amount: data.amount || 0,
    owedBy: typeof data.owedBy === 'object' && data.owedBy !== null ? data.owedBy : {},
    category: data.category || 'other',
    paidBy: data.paidBy || '',
    eventId: data.eventId ?? null,
    monthKey: data.monthKey || createMonthKey(new Date()),
    source: data.source || 'manual',
    shoppingListId: data.shoppingListId ?? null,
    shoppingItemIds: Array.isArray(data.shoppingItemIds) ? data.shoppingItemIds : [],
    isPaid: data.isPaid ?? false,
    createdBy: data.createdBy || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt
  }
}

function mapFinanceEvent(data: Record<string, any>, id: string): FinanceEvent {
  const rawKind = data.kind === 'one_time' ? 'event' : data.kind

  return {
    id,
    coupleId: data.coupleId,
    title: data.title || '',
    kind: rawKind === 'monthly' ? 'monthly' : 'event',
    category: data.category ?? null,
    archived: data.archived ?? false,
    createdBy: data.createdBy || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt || data.createdAt,
    archivedAt: data.archivedAt ?? null
  }
}

function buildBalanceSummary(entries: Expense[]): ExpenseBalanceSummary {
  const totals: Record<string, number> = {}
  const owedTotals: Record<string, number> = {}

  for (const expense of entries) {
    totals[expense.paidBy] = (totals[expense.paidBy] || 0) + expense.amount

    for (const [uid, amount] of Object.entries(expense.owedBy)) {
      owedTotals[uid] = (owedTotals[uid] || 0) + amount
    }
  }

  const uids = [...new Set([
    ...Object.keys(totals),
    ...Object.keys(owedTotals)
  ])]
  const balances: Record<string, number> = {}

  for (const uid of uids) {
    balances[uid] = (totals[uid] || 0) - (owedTotals[uid] || 0)
  }

  return {
    totals,
    owedTotals,
    balances,
    totalSpent: entries.reduce((sum, expense) => sum + expense.amount, 0)
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

  function findExpenseEvent(expense: Expense): FinanceEvent | null {
    if (!expense.eventId) return null
    return events.value.find((entry) => entry.id === expense.eventId) || null
  }

  function getExpenseScope(expense: Expense): 'monthly' | 'event' {
    const event = findExpenseEvent(expense)
    if (!event) return 'monthly'
    return event.kind === 'monthly' ? 'monthly' : 'event'
  }

  function isExpenseActive(expense: Expense): boolean {
    const event = findExpenseEvent(expense)
    if (!event) return true
    return !event.archived
  }

  const activeExpenses = computed(() => {
    return expenses.value.filter((expense) => isExpenseActive(expense))
  })

  const recentExpenses = computed(() => {
    return [...activeExpenses.value]
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .slice(0, 6)
  })

  const balanceInfo = computed(() => buildBalanceSummary(activeExpenses.value))

  const monthlySummaries = computed<MonthlyExpenseSummary[]>(() => {
    const byMonth = new Map<string, Expense[]>()

    for (const expense of activeExpenses.value) {
      if (getExpenseScope(expense) !== 'monthly') continue
      byMonth.set(expense.monthKey, [...(byMonth.get(expense.monthKey) || []), expense])
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([monthKey, monthExpenses]) => {
        const orderedExpenses = [...monthExpenses]
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

        return {
          monthKey,
          total: orderedExpenses.reduce((sum, expense) => sum + expense.amount, 0),
          balances: buildBalanceSummary(orderedExpenses).balances,
          expenses: orderedExpenses
        }
      })
  })

  const eventSummaries = computed<FinanceEventSummary[]>(() => {
    return events.value
      .filter((event) => event.kind === 'event')
      .map((event) => {
        const eventExpenses = expenses.value
          .filter((expense) => expense.eventId === event.id)
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

        return {
          event,
          total: eventExpenses.reduce((sum, expense) => sum + expense.amount, 0),
          balances: buildBalanceSummary(eventExpenses).balances,
          expenses: eventExpenses
        }
      })
  })

  const activeEventSummaries = computed(() => eventSummaries.value.filter((entry) => !entry.event.archived))
  const archivedEventSummaries = computed(() => eventSummaries.value.filter((entry) => entry.event.archived))
  const activeEvents = computed(() => events.value.filter((event) => event.kind === 'event' && !event.archived))
  const archivedEvents = computed(() => events.value.filter((event) => event.kind === 'event' && event.archived))

  async function addExpense(input: AddExpenseInput): Promise<string | null> {
    if (!coupleId.value || !user.value) return null

    const cleanTitle = input.title.trim()
    if (!cleanTitle || input.amountInCents <= 0 || !input.paidBy) return null

    const payload = {
      coupleId: coupleId.value,
      title: cleanTitle,
      amount: input.amountInCents,
      owedBy: input.owedBy ?? {},
      category: input.category,
      paidBy: input.paidBy,
      eventId: input.eventId ?? null,
      monthKey: createMonthKey(new Date()),
      source: input.source ?? 'manual',
      shoppingListId: input.shoppingListId ?? null,
      shoppingItemIds: input.shoppingItemIds ?? [],
      isPaid: false,
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

  async function updateExpense(id: string, input: UpdateExpenseInput): Promise<boolean> {
    if (!coupleId.value || !user.value) return false

    const cleanTitle = input.title.trim()
    if (!cleanTitle || input.amountInCents <= 0 || !input.paidBy) return false

    try {
      await updateDoc(doc(db, 'expenses', id), {
        title: cleanTitle,
        amount: input.amountInCents,
        owedBy: input.owedBy ?? {},
        category: input.category,
        paidBy: input.paidBy,
        eventId: input.eventId ?? null,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err: any) {
      console.error('Failed to update expense:', err)
      error.value = err.message
      return false
    }
  }

  async function setExpensePaid(id: string, isPaid: boolean) {
    try {
      await updateDoc(doc(db, 'expenses', id), {
        isPaid,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to toggle expense paid state:', err)
      error.value = err.message
    }
  }

  async function createEvent(title: string, options: { kind?: FinanceEventKind } = {}) {
    if (!coupleId.value || !user.value) return
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    try {
      await addDoc(collection(db, 'financeEvents'), {
        coupleId: coupleId.value,
        title: cleanTitle,
        kind: options.kind ?? 'event',
        category: null,
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

  async function deleteEvent(eventId: string): Promise<boolean> {
    const relatedExpenses = expenses.value.filter((expense) => expense.eventId === eventId)

    try {
      const batch = writeBatch(db)

      batch.delete(doc(db, 'financeEvents', eventId))
      for (const expense of relatedExpenses) {
        batch.delete(doc(db, 'expenses', expense.id))
      }

      await batch.commit()
      return true
    } catch (err: any) {
      console.error('Failed to delete finance event:', err)
      error.value = err.message
      return false
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
    recentExpenses,
    monthlySummaries,
    eventSummaries,
    activeEventSummaries,
    archivedEventSummaries,
    addExpense,
    updateExpense,
    deleteExpense,
    setExpensePaid,
    createEvent,
    deleteEvent,
    setEventArchived
  }
}

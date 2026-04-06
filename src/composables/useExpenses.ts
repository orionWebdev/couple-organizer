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
  writeBatch,
  setDoc
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Expense, ExpenseCategory, FinanceEvent, FinanceEventKind } from '@/types'

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
  eventId: string
  monthKey: string
  total: number
  perPerson: number
  settled: boolean
}

interface EventSummary {
  event: FinanceEvent
  total: number
  perPerson: number
  expenses: Expense[]
  settled: boolean
}

interface RecurringEventSummary {
  event: FinanceEvent
  entries: MonthlyFoodSummary[]
  unsettledTotal: number
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
    kind: data.kind || 'one_time',
    category: data.category ?? null,
    archived: data.archived ?? false,
    settledAt: data.settledAt ?? null,
    settledBy: data.settledBy ?? null,
    settledMonthKeys: Array.isArray(data.settledMonthKeys) ? data.settledMonthKeys : [],
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
  let creatingDefaultMonthlyEvent = false

  const loading = computed(() => loadingExpenses.value || loadingEvents.value)

  async function ensureDefaultFoodEvent(id: string) {
    if (creatingDefaultMonthlyEvent || !user.value) return
    creatingDefaultMonthlyEvent = true

    try {
      await setDoc(doc(db, 'financeEvents', `${id}_monthly_food`), {
        coupleId: id,
        title: 'Lebensmittel',
        kind: 'monthly',
        category: 'food',
        archived: false,
        settledAt: null,
        settledBy: null,
        settledMonthKeys: [],
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        archivedAt: null
      }, { merge: true })
    } catch (err: any) {
      console.error('Failed to ensure default monthly food event:', err)
      error.value = err.message
    } finally {
      creatingDefaultMonthlyEvent = false
    }
  }

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
        if (!events.value.some((event) => event.kind === 'monthly' && event.category === 'food')) {
          void ensureDefaultFoodEvent(id)
        }
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

  function isExpenseSettled(expense: Expense): boolean {
    if (expense.eventId) {
      const event = events.value.find((entry) => entry.id === expense.eventId)
      if (!event) return false
      if (event.kind === 'one_time') return Boolean(event.settledAt)
      return event.settledMonthKeys.includes(expense.monthKey)
    }

    const monthlyFoodEvent = events.value.find((entry) => entry.kind === 'monthly' && entry.category === 'food')
    if (expense.category === 'food' && !expense.eventId && monthlyFoodEvent) {
      return monthlyFoodEvent.settledMonthKeys.includes(expense.monthKey)
    }

    return false
  }

  const balanceInfo = computed(() => {
    const totals: Record<string, number> = {}
    for (const exp of expenses.value.filter((entry) => !isExpenseSettled(entry))) {
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
    const monthlyFoodEvent = events.value.find((event) => event.kind === 'monthly' && event.category === 'food')
    const byMonth = new Map<string, number>()
    for (const expense of expenses.value) {
      if (expense.category !== 'food') continue
      if (expense.eventId) continue
      byMonth.set(expense.monthKey, (byMonth.get(expense.monthKey) || 0) + expense.amount)
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([monthKey, total]) => ({
        eventId: monthlyFoodEvent?.id || '',
        monthKey,
        total,
        perPerson: total / 2,
        settled: monthlyFoodEvent?.settledMonthKeys.includes(monthKey) || false
      }))
  })

  const activeEvents = computed(() => events.value.filter((event) => !event.archived))
  const archivedEvents = computed(() => events.value.filter((event) => event.archived))

  const eventSummaries = computed<EventSummary[]>(() => {
    return events.value
      .filter((event) => event.kind === 'one_time')
      .map((event) => {
        const eventExpenses = expenses.value
          .filter((expense) => expense.eventId === event.id)
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

        const total = eventExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        return {
          event,
          total,
          perPerson: total / 2,
          expenses: eventExpenses,
          settled: Boolean(event.settledAt)
        }
      })
  })

  const recurringEventSummaries = computed<RecurringEventSummary[]>(() => {
    return events.value
      .filter((event) => event.kind === 'monthly')
      .map((event) => {
        const eventExpenses = expenses.value.filter((expense) => {
          if (event.category === 'food') {
            return expense.category === 'food' && !expense.eventId
          }
          return expense.eventId === event.id
        })

        const totalsByMonth = new Map<string, number>()
        for (const expense of eventExpenses) {
          totalsByMonth.set(expense.monthKey, (totalsByMonth.get(expense.monthKey) || 0) + expense.amount)
        }

        const entries = [...totalsByMonth.entries()]
          .sort(([a], [b]) => (a < b ? 1 : -1))
          .map(([monthKey, total]) => ({
            eventId: event.id,
            monthKey,
            total,
            perPerson: total / 2,
            settled: event.settledMonthKeys.includes(monthKey)
          }))

        return {
          event,
          entries,
          unsettledTotal: entries
            .filter((entry) => !entry.settled)
            .reduce((sum, entry) => sum + entry.total, 0)
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

  async function createEvent(
    title: string,
    options: {
      kind?: FinanceEventKind
      category?: ExpenseCategory | null
    } = {}
  ) {
    if (!coupleId.value || !user.value) return
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    try {
      await addDoc(collection(db, 'financeEvents'), {
        coupleId: coupleId.value,
        title: cleanTitle,
        kind: options.kind ?? 'one_time',
        category: options.category ?? null,
        archived: false,
        settledAt: null,
        settledBy: null,
        settledMonthKeys: [],
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

  async function setEventSettled(eventId: string, settled: boolean) {
    if (!user.value) return
    try {
      await updateDoc(doc(db, 'financeEvents', eventId), {
        settledAt: settled ? serverTimestamp() : null,
        settledBy: settled ? user.value.uid : null,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to settle finance event:', err)
      error.value = err.message
    }
  }

  async function setMonthlyEventMonthSettled(eventId: string, monthKey: string, settled: boolean) {
    const event = events.value.find((entry) => entry.id === eventId)
    if (!event) return

    const nextMonthKeys = settled
      ? [...new Set([...event.settledMonthKeys, monthKey])]
      : event.settledMonthKeys.filter((entry) => entry !== monthKey)

    try {
      await updateDoc(doc(db, 'financeEvents', eventId), {
        settledMonthKeys: nextMonthKeys,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to settle monthly finance event:', err)
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
    recurringEventSummaries,
    addExpense,
    deleteExpense,
    createEvent,
    setEventArchived,
    setEventSettled,
    setMonthlyEventMonthSettled
  }
}

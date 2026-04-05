import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Expense } from '@/types'

export function useExpenses(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const expenses = ref<Expense[]>([])
  const loading = ref(true)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true

    const q = query(
      collection(db, 'expenses'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(q, (snap) => {
      expenses.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense))
      loading.value = false
    })
  }

  watch(coupleId, (id) => {
    if (id) startListening(id)
  }, { immediate: true })

  // Balance calculation: positive = memberIds[1] owes memberIds[0]
  // Returns { [uid]: amountPaid } and the net balance
  const balanceInfo = computed(() => {
    const totals: Record<string, number> = {}
    for (const exp of expenses.value) {
      totals[exp.paidBy] = (totals[exp.paidBy] || 0) + exp.amount
    }

    const uids = Object.keys(totals)
    const totalSpent = Object.values(totals).reduce((a, b) => a + b, 0)
    const fairShare = totalSpent / 2

    // Each person's balance: positive means they are owed money
    const balances: Record<string, number> = {}
    for (const uid of uids) {
      balances[uid] = (totals[uid] || 0) - fairShare
    }

    return { totals, balances, totalSpent }
  })

  async function addExpense(title: string, amountInCents: number, paidBy: string) {
    if (!coupleId.value || !user.value) return
    await addDoc(collection(db, 'expenses'), {
      coupleId: coupleId.value,
      title,
      amount: amountInCents,
      paidBy,
      createdBy: user.value.uid,
      createdAt: serverTimestamp()
    })
  }

  async function deleteExpense(id: string) {
    await deleteDoc(doc(db, 'expenses', id))
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    expenses: readonly(expenses),
    loading: readonly(loading),
    balanceInfo,
    addExpense,
    deleteExpense
  }
}

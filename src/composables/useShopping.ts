import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { ShoppingItem } from '@/types'

export function useShopping(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const items = ref<ShoppingItem[]>([])
  const loading = ref(true)
  let unsubscribe: (() => void) | null = null

  // Sorted: unbought first, then bought
  const sortedItems = computed(() => {
    const unbought = items.value.filter((i) => !i.bought)
    const bought = items.value.filter((i) => i.bought)
    return [...unbought, ...bought]
  })

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true

    const q = query(
      collection(db, 'shoppingItems'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(q, (snap) => {
      items.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingItem))
      loading.value = false
    })
  }

  watch(coupleId, (id) => {
    if (id) startListening(id)
  }, { immediate: true })

  async function addItem(name: string) {
    if (!coupleId.value || !user.value) return
    await addDoc(collection(db, 'shoppingItems'), {
      coupleId: coupleId.value,
      name,
      bought: false,
      addedBy: user.value.uid,
      createdAt: serverTimestamp()
    })
  }

  async function toggleBought(id: string, bought: boolean) {
    await updateDoc(doc(db, 'shoppingItems', id), { bought })
  }

  async function deleteItem(id: string) {
    await deleteDoc(doc(db, 'shoppingItems', id))
  }

  // Clear all bought items at once
  async function clearBought() {
    const boughtItems = items.value.filter((i) => i.bought)
    await Promise.all(boughtItems.map((i) => deleteDoc(doc(db, 'shoppingItems', i.id))))
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    items: sortedItems,
    loading: readonly(loading),
    addItem,
    toggleBought,
    deleteItem,
    clearBought
  }
}

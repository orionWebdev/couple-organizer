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
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  const sortedItems = computed(() => {
    const unbought = items.value.filter((i) => !i.bought)
    const bought = items.value.filter((i) => i.bought)
    return [...unbought, ...bought]
  })

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const q = query(
      collection(db, 'shoppingItems'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        items.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingItem))
        loading.value = false
      },
      (err) => {
        console.error('Shopping listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (id) startListening(id)
  }, { immediate: true })

  async function addItem(name: string) {
    if (!coupleId.value || !user.value) return
    try {
      await addDoc(collection(db, 'shoppingItems'), {
        coupleId: coupleId.value,
        name,
        bought: false,
        addedBy: user.value.uid,
        createdAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to add shopping item:', err)
      error.value = err.message
    }
  }

  async function toggleBought(id: string, bought: boolean) {
    try {
      await updateDoc(doc(db, 'shoppingItems', id), { bought })
    } catch (err: any) {
      console.error('Failed to toggle bought:', err)
      error.value = err.message
    }
  }

  async function deleteItem(id: string) {
    try {
      await deleteDoc(doc(db, 'shoppingItems', id))
    } catch (err: any) {
      console.error('Failed to delete shopping item:', err)
      error.value = err.message
    }
  }

  async function clearBought() {
    try {
      const boughtItems = items.value.filter((i) => i.bought)
      await Promise.all(boughtItems.map((i) => deleteDoc(doc(db, 'shoppingItems', i.id))))
    } catch (err: any) {
      console.error('Failed to clear bought items:', err)
      error.value = err.message
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    items: sortedItems,
    loading: readonly(loading),
    error: readonly(error),
    addItem,
    toggleBought,
    deleteItem,
    clearBought
  }
}

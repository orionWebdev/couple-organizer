import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { FavoriteChore } from '@/types'

// Verknüpfungs-Collection: welche bestehenden Chores hat wer als Dashboard-
// Favorit markiert. Bewusst nur nach coupleId gefiltert und clientseitig
// verarbeitet — es sind wenige Einträge, das spart den Composite-Index.
export function useFavoriteChores(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const favorites = ref<FavoriteChore[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const q = query(collection(db, 'favoriteChores'), where('coupleId', '==', id))

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        favorites.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FavoriteChore))
        loading.value = false
      },
      (err) => {
        console.error('FavoriteChores listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      if (unsubscribe) unsubscribe()
      unsubscribe = null
      favorites.value = []
      loading.value = false
      return
    }
    startListening(id)
  }, { immediate: true })

  // Favoriten des aktuell eingeloggten Nutzers (jeder pflegt seine eigenen).
  const myFavorites = computed(() =>
    user.value ? favorites.value.filter((f) => f.owner === user.value!.uid) : []
  )

  const myFavoriteChoreIds = computed(() => new Set(myFavorites.value.map((f) => f.choreId)))

  function isFavorite(choreId: string): boolean {
    return myFavoriteChoreIds.value.has(choreId)
  }

  async function addFavorite(choreId: string): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    if (isFavorite(choreId)) return true
    try {
      await addDoc(collection(db, 'favoriteChores'), {
        coupleId: coupleId.value,
        owner: user.value.uid,
        choreId,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to add favorite chore:', err)
      error.value = err.message
      return false
    }
  }

  async function removeFavorite(choreId: string): Promise<boolean> {
    if (!user.value) return false
    const entry = myFavorites.value.find((f) => f.choreId === choreId)
    if (!entry) return true
    try {
      await deleteDoc(doc(db, 'favoriteChores', entry.id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to remove favorite chore:', err)
      error.value = err.message
      return false
    }
  }

  async function toggleFavorite(choreId: string): Promise<boolean> {
    return isFavorite(choreId) ? removeFavorite(choreId) : addFavorite(choreId)
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    favorites: readonly(favorites),
    myFavorites,
    myFavoriteChoreIds,
    loading: readonly(loading),
    error: readonly(error),
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite
  }
}

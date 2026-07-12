import { ref, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Note, Trip } from '@/types'

export interface TripDraft {
  title: string
  when: string
  emoji: string
}

// Reisen & Notizen des Planung-Tabs. Zwei kleine Collections in einem
// Composable — wie useBelegung mit resources + bookings, weil sie immer
// zusammen auf derselben Seite gebraucht werden.
export function usePlanung(coupleId: Ref<string | null>) {
  const { user } = useAuth()

  const trips = ref<Trip[]>([])
  const notes = ref<Note[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  let unsubTrips: (() => void) | null = null
  let unsubNotes: (() => void) | null = null

  function stopListening() {
    if (unsubTrips) unsubTrips()
    if (unsubNotes) unsubNotes()
    unsubTrips = null
    unsubNotes = null
  }

  function startListening(id: string) {
    stopListening()
    loading.value = true
    error.value = null

    unsubTrips = onSnapshot(
      query(collection(db, 'trips'), where('coupleId', '==', id), orderBy('createdAt', 'desc')),
      (snap) => {
        trips.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Trip)
        loading.value = false
      },
      (err) => {
        console.error('Trips listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )

    unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('coupleId', '==', id), orderBy('createdAt', 'desc')),
      (snap) => {
        notes.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Note)
        loading.value = false
      },
      (err) => {
        console.error('Notes listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      stopListening()
      trips.value = []
      notes.value = []
      loading.value = false
      return
    }
    startListening(id)
  }, { immediate: true })

  async function addTrip(draft: TripDraft): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const title = draft.title.trim()
    if (!title) return false

    try {
      await addDoc(collection(db, 'trips'), {
        coupleId: coupleId.value,
        title,
        when: draft.when.trim() || 'noch offen',
        emoji: draft.emoji,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to add trip:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteTrip(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'trips', id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete trip:', err)
      error.value = err.message
      return false
    }
  }

  async function addNote(text: string): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const clean = text.trim()
    if (!clean) return false

    try {
      await addDoc(collection(db, 'notes'), {
        coupleId: coupleId.value,
        text: clean,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to add note:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteNote(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'notes', id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete note:', err)
      error.value = err.message
      return false
    }
  }

  onScopeDispose(stopListening)

  return {
    trips: readonly(trips),
    notes: readonly(notes),
    loading: readonly(loading),
    error: readonly(error),
    addTrip,
    deleteTrip,
    addNote,
    deleteNote
  }
}

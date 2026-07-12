import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot, getDocs,
  addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import { useCouple } from './useCouple'
import { FREE_LIMITS } from '@/utils/premium'
import { weekdayIndex, fromDateKey } from '@/utils/belegung'
import type { Booking, BookingRepeat, Resource } from '@/types'

export interface BookingDraft {
  resourceId: string
  owner: string // uid
  date: string // YYYY-MM-DD
  allDay: boolean
  start: string // HH:MM
  end: string // HH:MM
  repeat: BookingRepeat
  note: string
}

export function useBelegung(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const { isPremium } = useCouple()

  const resources = ref<Resource[]>([])
  const bookings = ref<Booking[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const canAddResource = computed(
    () => isPremium.value || resources.value.length < FREE_LIMITS.belegungResources
  )

  let unsubResources: (() => void) | null = null
  let unsubBookings: (() => void) | null = null

  function stopListening() {
    console.log('[belegung] stopListening (Listener werden abgeräumt)')
    if (unsubResources) unsubResources()
    if (unsubBookings) unsubBookings()
    unsubResources = null
    unsubBookings = null
  }

  // Beide Collections komplett laden (wie überall sonst in der App) — die
  // Wochenansicht wird daraus clientseitig abgeleitet, weil wöchentliche Serien
  // in jeder späteren Woche auftauchen und sich nicht per Datumsfilter abfragen
  // lassen.
  function startListening(id: string) {
    stopListening()
    loading.value = true
    error.value = null

    console.log('[belegung] startListening für coupleId', id)

    unsubResources = onSnapshot(
      query(collection(db, 'resources'), where('coupleId', '==', id), orderBy('createdAt', 'asc')),
      (snap) => {
        console.log('[belegung] resources-Snapshot:', snap.size, 'Docs · fromCache',
          snap.metadata.fromCache, '· pendingWrites', snap.metadata.hasPendingWrites)
        resources.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Resource)
        loading.value = false
      },
      (err) => {
        console.error('Resources listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )

    unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), where('coupleId', '==', id), orderBy('createdAt', 'desc')),
      (snap) => {
        bookings.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
        loading.value = false
      },
      (err) => {
        console.error('Bookings listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    console.log('[belegung] coupleId-Watcher feuert:', id)
    if (!id) {
      stopListening()
      resources.value = []
      bookings.value = []
      loading.value = false
      return
    }
    startListening(id)
  }, { immediate: true })

  const resourceById = computed(() => {
    const map: Record<string, Resource> = {}
    for (const r of resources.value) map[r.id] = r
    return map
  })

  function countBookings(resourceId: string): number {
    return bookings.value.filter((b) => b.resourceId === resourceId).length
  }

  // ── Belegungen ──────────────────────────────────────────────────
  // Wird direkt eingetragen — kein Anfrage-/Bestätigen-Flow. Überschneidungen
  // zeigt das Sheet nur an, verhindern tut es sie nicht.
  async function addBooking(draft: BookingDraft): Promise<boolean> {
    if (!coupleId.value || !user.value) return false

    try {
      await addDoc(collection(db, 'bookings'), {
        coupleId: coupleId.value,
        resourceId: draft.resourceId,
        owner: draft.owner,
        date: draft.date,
        weekday: weekdayIndex(fromDateKey(draft.date)),
        allDay: draft.allDay,
        start: draft.allDay ? '00:00' : draft.start,
        end: draft.allDay ? '23:59' : draft.end,
        repeat: draft.repeat,
        note: draft.note.trim(),
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to add booking:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteBooking(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'bookings', id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete booking:', err)
      error.value = err.message
      return false
    }
  }

  // ── Ressourcen ──────────────────────────────────────────────────
  // Gibt die neue Id zurück, damit das Sheet die frisch angelegte Ressource
  // direkt vorauswählen kann.
  async function addResource(name: string, emoji: string): Promise<string | null> {
    if (!coupleId.value || !user.value) return null
    const cleanName = name.trim()
    if (!cleanName) return null
    if (!canAddResource.value) return null

    try {
      const ref = await addDoc(collection(db, 'resources'), {
        coupleId: coupleId.value,
        name: cleanName,
        emoji,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return ref.id
    } catch (err: any) {
      console.error('Failed to add resource:', err)
      error.value = err.message
      return null
    }
  }

  async function updateResource(id: string, name: string, emoji: string): Promise<boolean> {
    const cleanName = name.trim()
    if (!cleanName) return false

    try {
      await updateDoc(doc(db, 'resources', id), {
        name: cleanName,
        emoji,
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to update resource:', err)
      error.value = err.message
      return false
    }
  }

  // Eine gelöschte Ressource nimmt ihre Belegungen mit — sonst blieben Zeilen
  // ohne Icon/Namen im Kalender stehen.
  async function deleteResource(id: string): Promise<boolean> {
    if (!coupleId.value) return false

    try {
      const snap = await getDocs(
        query(
          collection(db, 'bookings'),
          where('coupleId', '==', coupleId.value),
          where('resourceId', '==', id)
        )
      )
      const batch = writeBatch(db)
      for (const d of snap.docs) batch.delete(d.ref)
      batch.delete(doc(db, 'resources', id))
      await batch.commit()
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete resource:', err)
      error.value = err.message
      return false
    }
  }

  onScopeDispose(stopListening)

  return {
    resources: readonly(resources),
    bookings: readonly(bookings),
    resourceById,
    loading: readonly(loading),
    error: readonly(error),
    canAddResource,
    countBookings,
    addBooking,
    deleteBooking,
    addResource,
    updateResource,
    deleteResource
  }
}

import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Chore, ChoreAssignee, ChoreHistoryEntry, ChorePoints, ChoreRoom, ChoreType } from '@/types'
import { POOL_SEED } from '@/utils/poolSeed'
import { isPointValue, pointsForChore, pointsForName } from '@/utils/points'

interface AddChoreInput {
  name: string
  room: ChoreRoom
  type: ChoreType
  assignee: ChoreAssignee
  points: ChorePoints
}

type UpdateChoreInput = AddChoreInput

// Merkt sich pro Couple, dass die Punkte-Migration in dieser Session bereits
// lief, damit mehrere Mountings der View sie nicht mehrfach anstoßen.
const migratedCouples = new Set<string>()

export function useChores(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const chores = ref<Chore[]>([])
  const history = ref<ChoreHistoryEntry[]>([])
  const loadingChores = ref(true)
  const loadingHistory = ref(true)
  const error = ref<string | null>(null)
  let unsubscribeChores: (() => void) | null = null
  let unsubscribeHistory: (() => void) | null = null

  const loading = computed(() => loadingChores.value || loadingHistory.value)

  function startListeningToChores(id: string) {
    if (unsubscribeChores) unsubscribeChores()
    loadingChores.value = true
    error.value = null

    const q = query(
      collection(db, 'chores'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribeChores = onSnapshot(
      q,
      (snap) => {
        chores.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chore))
        loadingChores.value = false
      },
      (err) => {
        console.error('Chores listener error:', err)
        error.value = err.message
        loadingChores.value = false
      }
    )
  }

  function startListeningToHistory(id: string) {
    if (unsubscribeHistory) unsubscribeHistory()
    loadingHistory.value = true
    error.value = null

    const q = query(
      collection(db, 'choreHistory'),
      where('coupleId', '==', id),
      orderBy('completedAt', 'desc')
    )

    unsubscribeHistory = onSnapshot(
      q,
      (snap) => {
        history.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChoreHistoryEntry))
        loadingHistory.value = false
      },
      (err) => {
        console.error('Chore history listener error:', err)
        error.value = err.message
        loadingHistory.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      chores.value = []
      history.value = []
      loadingChores.value = false
      loadingHistory.value = false
      return
    }
    startListeningToChores(id)
    startListeningToHistory(id)
  }, { immediate: true })

  async function addChore(input: AddChoreInput): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const cleanName = input.name.trim()
    if (!cleanName) return false

    try {
      await addDoc(collection(db, 'chores'), {
        coupleId: coupleId.value,
        name: cleanName,
        room: input.room,
        type: input.type,
        assignee: input.assignee,
        points: isPointValue(input.points) ? input.points : pointsForName(cleanName, input.room),
        done: false,
        completedAt: null,
        completedBy: null,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to add chore:', err)
      error.value = err.message
      return false
    }
  }

  // Legt den Standard-Aufgabenpool an. Bereits vorhandene Aufgaben (gleicher
  // Name, unabhängig von Groß-/Kleinschreibung) werden übersprungen, damit
  // mehrfaches Auslösen keine Duplikate erzeugt. Gibt die Anzahl neu
  // angelegter Aufgaben zurück (-1 bei Fehler).
  async function seedPool(): Promise<number> {
    if (!coupleId.value || !user.value) return -1

    const existing = new Set(chores.value.map((c) => c.name.trim().toLowerCase()))
    const toAdd = POOL_SEED.filter((t) => !existing.has(t.name.trim().toLowerCase()))
    if (toAdd.length === 0) return 0

    try {
      const batch = writeBatch(db)
      for (const task of toAdd) {
        const ref = doc(collection(db, 'chores'))
        batch.set(ref, {
          coupleId: coupleId.value,
          name: task.name,
          room: task.room,
          type: 'recurring',
          assignee: null,
          points: pointsForName(task.name, task.room),
          done: false,
          completedAt: null,
          completedBy: null,
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }
      await batch.commit()
      error.value = null
      return toAdd.length
    } catch (err: any) {
      console.error('Failed to seed chore pool:', err)
      error.value = err.message
      return -1
    }
  }

  async function updateChore(id: string, input: UpdateChoreInput): Promise<boolean> {
    const cleanName = input.name.trim()
    if (!cleanName) return false

    try {
      await updateDoc(doc(db, 'chores', id), {
        name: cleanName,
        room: input.room,
        type: input.type,
        assignee: input.assignee,
        points: isPointValue(input.points) ? input.points : pointsForName(cleanName, input.room),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to update chore:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteChore(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'chores', id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete chore:', err)
      error.value = err.message
      return false
    }
  }

  async function reassignChore(id: string, assignee: ChoreAssignee): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'chores', id), { assignee, updatedAt: serverTimestamp() })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to reassign chore:', err)
      error.value = err.message
      return false
    }
  }

  async function completeChore(chore: Chore, by: ChoreAssignee): Promise<boolean> {
    if (!coupleId.value) return false
    try {
      await updateDoc(doc(db, 'chores', chore.id), {
        done: chore.type === 'once' ? true : chore.done,
        completedAt: serverTimestamp(),
        completedBy: by,
        updatedAt: serverTimestamp()
      })
      await addDoc(collection(db, 'choreHistory'), {
        coupleId: coupleId.value,
        choreId: chore.id,
        choreName: chore.name,
        completedBy: by,
        points: pointsForChore(chore),
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to complete chore:', err)
      error.value = err.message
      return false
    }
  }

  async function undoChore(chore: Chore): Promise<boolean> {
    try {
      // Ordered newest-first: [0] is the completion we're undoing,
      // [1] (if any) becomes the new "last completed" state.
      const entries = history.value
        .filter((h) => h.choreId === chore.id)
        .sort((a, b) => toMillis(b.completedAt) - toMillis(a.completedAt))

      const latestEntry = entries[0]
      const previousEntry = entries[1] ?? null

      await updateDoc(doc(db, 'chores', chore.id), {
        done: chore.type === 'once' ? false : chore.done,
        completedAt: previousEntry ? previousEntry.completedAt : null,
        completedBy: previousEntry ? previousEntry.completedBy : null,
        updatedAt: serverTimestamp()
      })

      if (latestEntry) {
        await deleteDoc(doc(db, 'choreHistory', latestEntry.id))
      }
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to undo chore:', err)
      error.value = err.message
      return false
    }
  }

  async function reassignHistoryEntry(entryId: string, completedBy: ChoreAssignee): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'choreHistory', entryId), { completedBy })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to reassign history entry:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteHistoryEntry(entryId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'choreHistory', entryId))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete history entry:', err)
      error.value = err.message
      return false
    }
  }

  function toMillis(timestamp: unknown): number {
    if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
      return (timestamp as { toMillis: () => number }).toMillis()
    }
    return 0
  }

  // Einmalige Migration: weist Altbestand (Aufgaben + Verlauf) ohne points-Feld
  // faire Werte zu und schreibt so Nutzer:innen rückwirkend Punkte für bereits
  // erledigte Aufgaben gut. Läuft je Couple nur einmal pro Session und nur,
  // wenn tatsächlich Dokumente ohne Punkte existieren.
  async function migratePointsIfNeeded(id: string): Promise<void> {
    if (migratedCouples.has(id)) return

    const choresToFix = chores.value.filter((c) => !isPointValue(c.points))
    const historyToFix = history.value.filter((h) => !isPointValue(h.points))
    if (choresToFix.length === 0 && historyToFix.length === 0) {
      migratedCouples.add(id)
      return
    }

    // Vorab markieren, damit parallele Listener-Updates die Migration nicht
    // erneut anstoßen, während der Batch noch läuft.
    migratedCouples.add(id)

    try {
      // Ein WriteBatch fasst max. 500 Operationen — in Blöcken committen.
      let batch = writeBatch(db)
      let ops = 0
      const flush = async () => {
        if (ops > 0) {
          await batch.commit()
          batch = writeBatch(db)
          ops = 0
        }
      }

      for (const c of choresToFix) {
        batch.update(doc(db, 'chores', c.id), { points: pointsForChore(c) })
        if (++ops >= 400) await flush()
      }
      for (const h of historyToFix) {
        batch.update(doc(db, 'choreHistory', h.id), { points: pointsForName(h.choreName) })
        if (++ops >= 400) await flush()
      }
      await flush()
    } catch (err: any) {
      console.error('Failed to migrate chore points:', err)
      // Bei Fehler erneut versuchbar machen (z. B. beim nächsten Snapshot).
      migratedCouples.delete(id)
    }
  }

  // Sobald beide Listener erstmals geladen haben, Migration prüfen/anstoßen.
  watch(loading, (isLoading) => {
    if (!isLoading && coupleId.value) migratePointsIfNeeded(coupleId.value)
  }, { immediate: true })

  onScopeDispose(() => {
    if (unsubscribeChores) unsubscribeChores()
    if (unsubscribeHistory) unsubscribeHistory()
  })

  return {
    chores: readonly(chores),
    history: readonly(history),
    loading,
    error: readonly(error),
    addChore,
    seedPool,
    updateChore,
    deleteChore,
    reassignChore,
    completeChore,
    undoChore,
    reassignHistoryEntry,
    deleteHistoryEntry
  }
}

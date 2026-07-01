import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Chore, ChoreAssignee, ChoreHistoryEntry, ChoreInterval, ChoreType } from '@/types'

interface AddChoreInput {
  name: string
  type: ChoreType
  interval: ChoreInterval | null
  dueDate: Date | null
  assignee: ChoreAssignee
}

type UpdateChoreInput = AddChoreInput

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
    if (id) {
      startListeningToChores(id)
      startListeningToHistory(id)
    }
  }, { immediate: true })

  async function addChore(input: AddChoreInput): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const cleanName = input.name.trim()
    if (!cleanName) return false

    try {
      await addDoc(collection(db, 'chores'), {
        coupleId: coupleId.value,
        name: cleanName,
        type: input.type,
        interval: input.type === 'recurring' ? input.interval : null,
        dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
        assignee: input.assignee,
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

  async function updateChore(id: string, input: UpdateChoreInput): Promise<boolean> {
    const cleanName = input.name.trim()
    if (!cleanName) return false

    try {
      await updateDoc(doc(db, 'chores', id), {
        name: cleanName,
        type: input.type,
        interval: input.type === 'recurring' ? input.interval : null,
        dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
        assignee: input.assignee,
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
    updateChore,
    deleteChore,
    reassignChore,
    completeChore,
    undoChore,
    reassignHistoryEntry,
    deleteHistoryEntry
  }
}

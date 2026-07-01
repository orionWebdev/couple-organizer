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

  async function addChore(input: AddChoreInput) {
    if (!coupleId.value || !user.value) return
    const cleanName = input.name.trim()
    if (!cleanName) return

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
    } catch (err: any) {
      console.error('Failed to add chore:', err)
      error.value = err.message
    }
  }

  async function updateChore(id: string, input: UpdateChoreInput) {
    const cleanName = input.name.trim()
    if (!cleanName) return

    try {
      await updateDoc(doc(db, 'chores', id), {
        name: cleanName,
        type: input.type,
        interval: input.type === 'recurring' ? input.interval : null,
        dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
        assignee: input.assignee,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to update chore:', err)
      error.value = err.message
    }
  }

  async function deleteChore(id: string) {
    try {
      await deleteDoc(doc(db, 'chores', id))
    } catch (err: any) {
      console.error('Failed to delete chore:', err)
      error.value = err.message
    }
  }

  async function reassignChore(id: string, assignee: ChoreAssignee) {
    try {
      await updateDoc(doc(db, 'chores', id), { assignee, updatedAt: serverTimestamp() })
    } catch (err: any) {
      console.error('Failed to reassign chore:', err)
      error.value = err.message
    }
  }

  async function completeChore(chore: Chore, by: ChoreAssignee) {
    if (!coupleId.value) return
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
    } catch (err: any) {
      console.error('Failed to complete chore:', err)
      error.value = err.message
    }
  }

  async function undoChore(chore: Chore) {
    try {
      await updateDoc(doc(db, 'chores', chore.id), {
        done: false,
        completedAt: null,
        completedBy: null,
        updatedAt: serverTimestamp()
      })

      const latestEntry = history.value
        .filter((h) => h.choreId === chore.id)
        .sort((a, b) => toMillis(b.completedAt) - toMillis(a.completedAt))[0]

      if (latestEntry) {
        await deleteDoc(doc(db, 'choreHistory', latestEntry.id))
      }
    } catch (err: any) {
      console.error('Failed to undo chore:', err)
      error.value = err.message
    }
  }

  async function reassignHistoryEntry(entryId: string, completedBy: ChoreAssignee) {
    try {
      await updateDoc(doc(db, 'choreHistory', entryId), { completedBy })
    } catch (err: any) {
      console.error('Failed to reassign history entry:', err)
      error.value = err.message
    }
  }

  async function deleteHistoryEntry(entryId: string) {
    try {
      await deleteDoc(doc(db, 'choreHistory', entryId))
    } catch (err: any) {
      console.error('Failed to delete history entry:', err)
      error.value = err.message
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

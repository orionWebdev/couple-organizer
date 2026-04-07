import { ref, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Todo, TodoCategory } from '@/types'

interface AddTodoOptions {
  assignedTo?: string | null
  category?: TodoCategory | null
  dueDate?: Date | null
  recurring?: boolean
}

export function useTodos(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const todos = ref<Todo[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const q = query(
      collection(db, 'todos'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        todos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Todo))
        loading.value = false
      },
      (err) => {
        console.error('Todos listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (id) startListening(id)
  }, { immediate: true })

  async function addTodo(title: string, options: AddTodoOptions = {}) {
    if (!coupleId.value || !user.value) return
    try {
      await addDoc(collection(db, 'todos'), {
        coupleId: coupleId.value,
        title,
        done: false,
        assignedTo: options.assignedTo ?? null,
        createdBy: user.value.uid,
        category: options.category ?? null,
        dueDate: options.dueDate ? Timestamp.fromDate(options.dueDate) : null,
        recurring: options.recurring ?? false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to add todo:', err)
      error.value = err.message
    }
  }

  async function toggleTodo(id: string, done: boolean) {
    try {
      await updateDoc(doc(db, 'todos', id), { done, updatedAt: serverTimestamp() })
    } catch (err: any) {
      console.error('Failed to toggle todo:', err)
      error.value = err.message
    }
  }

  async function updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'assignedTo' | 'category' | 'dueDate' | 'recurring'>>) {
    try {
      await updateDoc(doc(db, 'todos', id), { ...updates, updatedAt: serverTimestamp() })
    } catch (err: any) {
      console.error('Failed to update todo:', err)
      error.value = err.message
    }
  }

  async function deleteTodo(id: string) {
    try {
      await deleteDoc(doc(db, 'todos', id))
    } catch (err: any) {
      console.error('Failed to delete todo:', err)
      error.value = err.message
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    todos: readonly(todos),
    loading: readonly(loading),
    error: readonly(error),
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo
  }
}

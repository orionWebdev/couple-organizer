import { ref, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { Todo } from '@/types'

export function useTodos(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const todos = ref<Todo[]>([])
  const loading = ref(true)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true

    const q = query(
      collection(db, 'todos'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(q, (snap) => {
      todos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Todo))
      loading.value = false
    })
  }

  // Watch coupleId and restart listener when it changes
  watch(coupleId, (id) => {
    if (id) startListening(id)
  }, { immediate: true })

  async function addTodo(title: string, assignedTo: string | null = null) {
    if (!coupleId.value || !user.value) return
    await addDoc(collection(db, 'todos'), {
      coupleId: coupleId.value,
      title,
      done: false,
      assignedTo,
      createdBy: user.value.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  async function toggleTodo(id: string, done: boolean) {
    await updateDoc(doc(db, 'todos', id), { done, updatedAt: serverTimestamp() })
  }

  async function updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'assignedTo'>>) {
    await updateDoc(doc(db, 'todos', id), { ...updates, updatedAt: serverTimestamp() })
  }

  async function deleteTodo(id: string) {
    await deleteDoc(doc(db, 'todos', id))
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    todos: readonly(todos),
    loading: readonly(loading),
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo
  }
}

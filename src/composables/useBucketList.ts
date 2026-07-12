import { ref, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { IdeaCategory, BucketListItem } from '@/types'

export interface AddBucketItemInput {
  category: IdeaCategory
  name: string
  note?: string
  suggestedBy?: string // uid — Default: wer gerade eingeloggt ist
}

export function useBucketList(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const items = ref<BucketListItem[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const q = query(
      collection(db, 'bucketListItems'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'desc')
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        items.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BucketListItem))
        loading.value = false
      },
      (err) => {
        console.error('Bucket list listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      items.value = []
      loading.value = false
      return
    }
    startListening(id)
  }, { immediate: true })

  async function addItem(input: AddBucketItemInput): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const cleanName = input.name.trim()
    if (!cleanName) return false

    try {
      await addDoc(collection(db, 'bucketListItems'), {
        coupleId: coupleId.value,
        category: input.category,
        name: cleanName,
        note: input.note?.trim() ?? '',
        done: false,
        suggestedBy: input.suggestedBy || user.value.uid,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to add bucket list item:', err)
      error.value = err.message
      return false
    }
  }

  async function toggleDone(item: BucketListItem): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'bucketListItems', item.id), {
        done: !item.done,
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to toggle bucket list item:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteItem(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'bucketListItems', id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete bucket list item:', err)
      error.value = err.message
      return false
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    items: readonly(items),
    loading: readonly(loading),
    error: readonly(error),
    addItem,
    toggleDone,
    deleteItem
  }
}

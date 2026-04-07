import { ref, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { RecipeCategory, RecipeCategoryColor } from '@/types'

interface CategoryInput {
  name: string
  color: RecipeCategoryColor
  icon?: string
}

export function useRecipeCategories(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const categories = ref<RecipeCategory[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const q = query(
      collection(db, 'recipeCategories'),
      where('coupleId', '==', id),
      orderBy('createdAt', 'asc')
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        categories.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecipeCategory))
        loading.value = false
      },
      (err) => {
        console.error('Recipe categories listener error:', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (id) {
      startListening(id)
      return
    }
    categories.value = []
    loading.value = false
  }, { immediate: true })

  async function addCategory(input: CategoryInput) {
    if (!coupleId.value || !user.value) return
    try {
      await addDoc(collection(db, 'recipeCategories'), {
        coupleId: coupleId.value,
        name: input.name,
        color: input.color,
        icon: input.icon ?? '',
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to add category:', err)
      error.value = err.message
    }
  }

  async function updateCategory(id: string, input: CategoryInput) {
    try {
      await updateDoc(doc(db, 'recipeCategories', id), {
        name: input.name,
        color: input.color,
        icon: input.icon ?? '',
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to update category:', err)
      error.value = err.message
    }
  }

  async function deleteCategory(id: string) {
    try {
      await deleteDoc(doc(db, 'recipeCategories', id))
    } catch (err: any) {
      console.error('Failed to delete category:', err)
      error.value = err.message
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    categories: readonly(categories),
    loading: readonly(loading),
    error: readonly(error),
    addCategory,
    updateCategory,
    deleteCategory
  }
}

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
import type { Recipe, RecipeIngredient } from '@/types'

export interface RecipeInput {
  title: string
  ingredients: RecipeIngredient[]
  instructions: string
  categories: string[]
  image?: string
  isFavorite?: boolean
  cookingTime?: number
}

export function useRecipes(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const recipes = ref<Recipe[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  function startListening(id: string) {
    if (unsubscribe) unsubscribe()
    loading.value = true
    error.value = null

    const q = query(
      collection(db, 'recipes'),
      where('coupleId', '==', id),
      orderBy('updatedAt', 'desc')
    )

    unsubscribe = onSnapshot(
      q,
      (snap) => {
        recipes.value = snap.docs.map((recipeDoc) => ({
          id: recipeDoc.id,
          ...recipeDoc.data()
        } as Recipe))
        loading.value = false
      },
      (err) => {
        console.error('Recipes listener error:', err)
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
    recipes.value = []
    loading.value = false
  }, { immediate: true })

  async function addRecipe(input: RecipeInput) {
    if (!coupleId.value || !user.value) return
    try {
      await addDoc(collection(db, 'recipes'), {
        coupleId: coupleId.value,
        title: input.title,
        ingredients: input.ingredients,
        instructions: input.instructions,
        categories: input.categories ?? [],
        image: input.image ?? '',
        isFavorite: input.isFavorite ?? false,
        cookingTime: input.cookingTime ?? null,
        lastUsedAt: null,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to add recipe:', err)
      error.value = err.message
    }
  }

  async function updateRecipe(id: string, input: RecipeInput) {
    try {
      await updateDoc(doc(db, 'recipes', id), {
        title: input.title,
        ingredients: input.ingredients,
        instructions: input.instructions,
        categories: input.categories ?? [],
        image: input.image ?? '',
        isFavorite: input.isFavorite ?? false,
        cookingTime: input.cookingTime ?? null,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to update recipe:', err)
      error.value = err.message
    }
  }

  async function deleteRecipe(id: string) {
    try {
      await deleteDoc(doc(db, 'recipes', id))
    } catch (err: any) {
      console.error('Failed to delete recipe:', err)
      error.value = err.message
    }
  }

  async function toggleFavorite(id: string) {
    const recipe = recipes.value.find((r) => r.id === id)
    if (!recipe) return
    try {
      await updateDoc(doc(db, 'recipes', id), {
        isFavorite: !recipe.isFavorite,
        updatedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err)
      error.value = err.message
    }
  }

  async function markAsUsed(id: string) {
    try {
      await updateDoc(doc(db, 'recipes', id), {
        lastUsedAt: serverTimestamp()
      })
    } catch (err: any) {
      console.error('Failed to mark as used:', err)
    }
  }

  onScopeDispose(() => {
    if (unsubscribe) unsubscribe()
  })

  return {
    recipes: readonly(recipes),
    loading: readonly(loading),
    error: readonly(error),
    addRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    markAsUsed
  }
}

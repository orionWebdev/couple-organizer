import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import type { MealPlanEntry, Recipe, RecipeIngredient } from '@/types'
import { suggestRecipes as fetchSuggestions, type RecipeSuggestion } from '@/services/gemini'
import { currentWeekDates, dateKey as toDateKey } from '@/utils/mealplan'

export interface AssignRecipeInput {
  title: string
  description?: string
  minutes?: number | null
  servings?: number | null
  tags?: string[]
  ingredients?: RecipeIngredient[]
  source: 'manual' | 'ai'
}

export interface WeekDay {
  date: Date
  dateKey: string
  entry: MealPlanEntry | null
  recipe: Recipe | null
}

export function useMealPlan(coupleId: Ref<string | null>) {
  const { user } = useAuth()
  const recipes = ref<Recipe[]>([])
  const entries = ref<MealPlanEntry[]>([])
  const loadingRecipes = ref(true)
  const loadingEntries = ref(true)
  const error = ref<string | null>(null)
  let unsubscribeRecipes: (() => void) | null = null
  let unsubscribeEntries: (() => void) | null = null

  const loading = computed(() => loadingRecipes.value || loadingEntries.value)

  function startListeningToRecipes(id: string) {
    if (unsubscribeRecipes) unsubscribeRecipes()
    loadingRecipes.value = true
    error.value = null

    const q = query(
      collection(db, 'recipes'),
      where('coupleId', '==', id),
      orderBy('updatedAt', 'desc')
    )

    unsubscribeRecipes = onSnapshot(
      q,
      (snap) => {
        recipes.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe))
        loadingRecipes.value = false
      },
      (err) => {
        console.error('Recipes listener error:', err)
        error.value = err.message
        loadingRecipes.value = false
      }
    )
  }

  function startListeningToEntries(id: string) {
    if (unsubscribeEntries) unsubscribeEntries()
    loadingEntries.value = true
    error.value = null

    const q = query(
      collection(db, 'mealPlans'),
      where('coupleId', '==', id),
      orderBy('dateKey', 'asc')
    )

    unsubscribeEntries = onSnapshot(
      q,
      (snap) => {
        entries.value = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealPlanEntry))
        loadingEntries.value = false
      },
      (err) => {
        console.error('Meal plan listener error:', err)
        error.value = err.message
        loadingEntries.value = false
      }
    )
  }

  watch(coupleId, (id) => {
    if (!id) {
      recipes.value = []
      entries.value = []
      loadingRecipes.value = false
      loadingEntries.value = false
      return
    }

    startListeningToRecipes(id)
    startListeningToEntries(id)
  }, { immediate: true })

  const weekDates = computed(() => currentWeekDates())

  const week = computed<WeekDay[]>(() =>
    weekDates.value.map((date) => {
      const key = toDateKey(date)
      const entry = entries.value.find((e) => e.dateKey === key) ?? null
      const recipe = entry ? recipes.value.find((r) => r.id === entry.recipeId) ?? null : null
      return { date, dateKey: key, entry, recipe }
    })
  )

  // Nie an den Aufrufer werfen — analog zu den anderen use*.ts-Composables.
  async function suggestRecipes(searchQuery: string, count = 3): Promise<RecipeSuggestion[]> {
    try {
      const results = await fetchSuggestions(searchQuery, count)
      error.value = null
      return results
    } catch (err: any) {
      console.error('Failed to fetch recipe suggestions:', err)
      error.value = err.message
      return []
    }
  }

  async function assignRecipe(dateKeyValue: string, input: AssignRecipeInput): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const cleanTitle = input.title.trim()
    if (!cleanTitle) return false

    try {
      const recipeRef = await addDoc(collection(db, 'recipes'), {
        coupleId: coupleId.value,
        title: cleanTitle,
        description: input.description?.trim() ?? '',
        minutes: input.minutes ?? null,
        servings: input.servings ?? null,
        tags: input.tags ?? [],
        ingredients: input.ingredients ?? [],
        source: input.source,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Vorhandenen Eintrag für den Tag ersetzen statt zu duplizieren.
      const existing = entries.value.find((e) => e.dateKey === dateKeyValue)
      if (existing) {
        await deleteDoc(doc(db, 'mealPlans', existing.id))
      }

      await addDoc(collection(db, 'mealPlans'), {
        coupleId: coupleId.value,
        dateKey: dateKeyValue,
        recipeId: recipeRef.id,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to assign recipe:', err)
      error.value = err.message
      return false
    }
  }

  async function removeAssignment(entryId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'mealPlans', entryId))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to remove meal plan entry:', err)
      error.value = err.message
      return false
    }
  }

  onScopeDispose(() => {
    if (unsubscribeRecipes) unsubscribeRecipes()
    if (unsubscribeEntries) unsubscribeEntries()
  })

  return {
    week,
    loading,
    error: readonly(error),
    suggestRecipes,
    assignRecipe,
    removeAssignment
  }
}

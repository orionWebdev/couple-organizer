import { ref, computed, onScopeDispose, readonly, type Ref, watch } from 'vue'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuth } from './useAuth'
import { useCouple } from './useCouple'
import { FREE_LIMITS } from '@/utils/premium'
import type { MealPlanEntry, Recipe, RecipeIngredient, RecipeNutrition } from '@/types'
import { suggestRecipes as fetchSuggestions, planWeek as fetchWeekPlan, type RecipeSuggestion, type AiResult } from '@/services/ai'
import { currentWeekDates, dateKey as toDateKey } from '@/utils/mealplan'

// Ein von der KI geplantes Gericht, das auf einen konkreten Tag gemünzt ist.
export interface WeekPlanDay {
  dateKey: string
  suggestion: RecipeSuggestion
}

const AVOID_WINDOW_DAYS = 14

export interface AssignRecipeInput {
  title: string
  description?: string
  minutes?: number | null
  servings?: number | null
  tags?: string[]
  ingredients?: RecipeIngredient[]
  steps?: string[]
  nutrition?: RecipeNutrition | null
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
  const { isPremium } = useCouple()
  const recipes = ref<Recipe[]>([])
  const entries = ref<MealPlanEntry[]>([])
  const loadingRecipes = ref(true)
  const loadingEntries = ref(true)
  const error = ref<string | null>(null)
  let unsubscribeRecipes: (() => void) | null = null
  let unsubscribeEntries: (() => void) | null = null

  const loading = computed(() => loadingRecipes.value || loadingEntries.value)

  // Gilt für BEIDE Wege, auf denen ein Rezept-Doc entsteht: createRecipe() aus
  // dem Rezept-Wiki und assignRecipe(), das beim Zuweisen still eines anlegt.
  const canCreateRecipe = computed(
    () => isPremium.value || recipes.value.length < FREE_LIMITS.recipeCount
  )

  // Wochen-Autopilot ist ein reines Plus-Feature. Der Server erzwingt es
  // ohnehin (weekPlanAi free: 0), aber die View prüft das hier vorab, damit die
  // Paywall aufgeht statt eine leere Konfig-Maske — und weil der Vercel-
  // Direktweg keine serverseitige Quote hat.
  const canPlanWeek = computed(() => isPremium.value)

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
        // Altbestand: Rezepte von vor der steps/nutrition-Erweiterung haben
        // diese Felder nicht in Firestore — ohne Default würde z. B.
        // recipe.steps.length im Detail-Modal auf undefined crashen.
        recipes.value = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            ...data,
            tags: data.tags ?? [],
            likes: data.likes ?? [],
            ingredients: data.ingredients ?? [],
            steps: data.steps ?? [],
            nutrition: data.nutrition ?? null,
          } as Recipe
        })
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
  // Quota-/Premium-Ablehnungen sind aber KEIN Fehler: sie kommen als eigener
  // AiResult-Zweig zurück, damit der Aufrufer die Paywall öffnen kann statt
  // einen Toast zu zeigen.
  async function suggestRecipes(searchQuery: string, count = 3): Promise<AiResult<RecipeSuggestion[]>> {
    if (!coupleId.value) return { kind: 'ok', data: [], quota: { used: 0, limit: 0 } }
    try {
      const result = await fetchSuggestions(coupleId.value, searchQuery, count)
      error.value = null
      return result
    } catch (err: any) {
      console.error('Failed to fetch recipe suggestions:', err)
      error.value = err.message
      return { kind: 'ok', data: [], quota: { used: 0, limit: 0 } }
    }
  }

  // Plant alle Kochtage der Woche in einem KI-Aufruf. Reichert den Aufruf mit
  // Kontext an, den nur das Composable kennt: gelikte Rezepte als "gerne wieder"
  // (favorTitles) und die zuletzt gekochten als "nicht schon wieder"
  // (avoidTitles). Nie werfen — Quota/Premium kommen als AiResult-Zweig zurück.
  async function planWeek(opts: { count: number; servings?: number | null; prefs?: string }): Promise<AiResult<RecipeSuggestion[]>> {
    if (!coupleId.value) return { kind: 'ok', data: [], quota: { used: 0, limit: 0 } }

    const favorTitles = recipes.value
      .filter((r) => r.likes.length > 0)
      .map((r) => r.title)
      .slice(0, 12)

    const cutoffKey = toDateKey(new Date(Date.now() - AVOID_WINDOW_DAYS * 86400000))
    const recentIds = new Set(entries.value.filter((e) => e.dateKey >= cutoffKey).map((e) => e.recipeId))
    const avoidTitles = [
      ...new Set(recipes.value.filter((r) => recentIds.has(r.id)).map((r) => r.title)),
    ]

    try {
      const result = await fetchWeekPlan(coupleId.value, {
        count: opts.count,
        servings: opts.servings ?? null,
        prefs: opts.prefs,
        avoidTitles,
        favorTitles,
      })
      error.value = null
      return result
    } catch (err: any) {
      console.error('Failed to plan week:', err)
      error.value = err.message
      return { kind: 'ok', data: [], quota: { used: 0, limit: 0 } }
    }
  }

  function suggestionToInput(s: RecipeSuggestion): AssignRecipeInput {
    return {
      title: s.title,
      description: s.description,
      minutes: s.minutes ?? null,
      servings: s.servings ?? null,
      tags: s.tags ?? [],
      ingredients: s.ingredients,
      steps: s.steps,
      nutrition: s.nutrition ?? null,
      source: 'ai',
    }
  }

  // Schreibt einen kompletten Wochenplan. "Mix"-Logik: matcht ein Vorschlag per
  // Titel ein bereits vorhandenes Rezept (z. B. einen wieder eingeplanten
  // Favoriten), wird dieses verplant statt ein Duplikat anzulegen — sonst
  // entsteht ein neues Rezept-Dokument. Gibt zurück, wie viele Tage geschrieben
  // wurden.
  async function applyWeekPlan(days: WeekPlanDay[]): Promise<number> {
    if (!coupleId.value || !user.value) return 0
    let written = 0
    for (const day of days) {
      const wanted = day.suggestion.title.trim().toLowerCase()
      const existing = recipes.value.find((r) => r.title.trim().toLowerCase() === wanted)
      const ok = existing
        ? await assignExistingRecipe(day.dateKey, existing.id)
        : await assignRecipe(day.dateKey, suggestionToInput(day.suggestion))
      if (ok) written++
    }
    return written
  }

  function recipeDocPayload(input: AssignRecipeInput, cleanTitle: string) {
    return {
      coupleId: coupleId.value,
      title: cleanTitle,
      description: input.description?.trim() ?? '',
      minutes: input.minutes ?? null,
      servings: input.servings ?? null,
      tags: input.tags ?? [],
      ingredients: input.ingredients ?? [],
      steps: input.steps ?? [],
      nutrition: input.nutrition ?? null,
      source: input.source,
      createdBy: user.value!.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  }

  async function assignRecipe(dateKeyValue: string, input: AssignRecipeInput): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const cleanTitle = input.title.trim()
    if (!cleanTitle) return false
    if (!canCreateRecipe.value) return false

    try {
      const recipeRef = await addDoc(collection(db, 'recipes'), recipeDocPayload(input, cleanTitle))

      // Vorhandenen Eintrag für den Tag ersetzen statt zu duplizieren.
      const existing = entries.value.find((e) => e.dateKey === dateKeyValue)
      if (existing) {
        await deleteDoc(doc(db, 'mealPlans', existing.id))
      }

      await addDoc(collection(db, 'mealPlans'), {
        coupleId: coupleId.value,
        dateKey: dateKeyValue,
        recipeId: recipeRef.id,
        cookAssignee: null,
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

  // Verplant ein bereits existierendes Wiki-Rezept für einen Tag, ohne es
  // zu duplizieren (im Gegensatz zu assignRecipe, das immer ein neues
  // Recipe-Dokument anlegt).
  async function assignExistingRecipe(dateKeyValue: string, recipeId: string): Promise<boolean> {
    if (!coupleId.value || !user.value) return false

    try {
      const existing = entries.value.find((e) => e.dateKey === dateKeyValue)
      if (existing) {
        await deleteDoc(doc(db, 'mealPlans', existing.id))
      }

      await addDoc(collection(db, 'mealPlans'), {
        coupleId: coupleId.value,
        dateKey: dateKeyValue,
        recipeId,
        cookAssignee: null,
        createdBy: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to assign existing recipe:', err)
      error.value = err.message
      return false
    }
  }

  // Speichert ein Rezept in der Wiki-Sammlung, ohne es einem Tag zuzuweisen.
  async function createRecipe(input: AssignRecipeInput): Promise<boolean> {
    if (!coupleId.value || !user.value) return false
    const cleanTitle = input.title.trim()
    if (!cleanTitle) return false
    if (!canCreateRecipe.value) return false

    try {
      await addDoc(collection(db, 'recipes'), recipeDocPayload(input, cleanTitle))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to create recipe:', err)
      error.value = err.message
      return false
    }
  }

  async function updateRecipe(id: string, input: AssignRecipeInput): Promise<boolean> {
    const cleanTitle = input.title.trim()
    if (!cleanTitle) return false

    try {
      await updateDoc(doc(db, 'recipes', id), {
        title: cleanTitle,
        description: input.description?.trim() ?? '',
        minutes: input.minutes ?? null,
        servings: input.servings ?? null,
        tags: input.tags ?? [],
        ingredients: input.ingredients ?? [],
        steps: input.steps ?? [],
        nutrition: input.nutrition ?? null,
        updatedAt: serverTimestamp()
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to update recipe:', err)
      error.value = err.message
      return false
    }
  }

  // "Herz je Person": schaltet das Herz des angegebenen Nutzers um. Bewusst OHNE
  // updatedAt — ein Herz ist keine inhaltliche Änderung und soll die nach
  // updatedAt sortierte Liste (und damit den Foto-Hero) nicht umsortieren.
  async function toggleRecipeLike(recipeId: string, uid: string): Promise<boolean> {
    const recipe = recipes.value.find((r) => r.id === recipeId)
    const liked = recipe?.likes.includes(uid) ?? false
    try {
      await updateDoc(doc(db, 'recipes', recipeId), {
        likes: liked ? arrayRemove(uid) : arrayUnion(uid)
      })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to toggle recipe like:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteRecipe(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'recipes', id))
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to delete recipe:', err)
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

  async function setCookAssignee(entryId: string, cookAssignee: string | 'both' | null): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'mealPlans', entryId), { cookAssignee, updatedAt: serverTimestamp() })
      error.value = null
      return true
    } catch (err: any) {
      console.error('Failed to set cook assignee:', err)
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
    recipes: readonly(recipes),
    loading,
    error: readonly(error),
    canCreateRecipe,
    canPlanWeek,
    suggestRecipes,
    planWeek,
    applyWeekPlan,
    assignRecipe,
    assignExistingRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleRecipeLike,
    removeAssignment,
    setCookAssignee
  }
}

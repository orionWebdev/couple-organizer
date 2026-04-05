<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MEAL_PLAN_DAYS, useMealPlan } from '@/composables/useMealPlan'
import { useRecipes } from '@/composables/useRecipes'
import { useShopping } from '@/composables/useShopping'

const props = defineProps<{
  coupleId: string
}>()

const coupleIdRef = computed<string | null>(() => props.coupleId)

const { recipes } = useRecipes(coupleIdRef)
const { weekLabel, weekKey, days, loading, error, shiftWeek, goToCurrentWeek, setRecipeForDay } = useMealPlan(coupleIdRef)
const { lists, generateItemsFromIngredients } = useShopping(coupleIdRef)

const selectedListId = ref('')
const generationMessage = ref<string | null>(null)
const generationError = ref<string | null>(null)
const generating = ref(false)

watch(lists, (availableLists) => {
  if (availableLists.length === 0) {
    selectedListId.value = ''
    return
  }

  if (!selectedListId.value || !availableLists.some((list) => list.id === selectedListId.value)) {
    selectedListId.value = availableLists[0].id
  }
}, { immediate: true })

const recipesById = computed(() => {
  const map = new Map<string, (typeof recipes.value)[number]>()
  for (const recipe of recipes.value) {
    map.set(recipe.id, recipe)
  }
  return map
})

async function handleRecipeChange(dayKey: (typeof MEAL_PLAN_DAYS)[number]['key'], recipeId: string) {
  await setRecipeForDay(dayKey, recipeId || null)
}

async function handleGenerateShoppingList() {
  generationMessage.value = null
  generationError.value = null

  if (!selectedListId.value) {
    generationError.value = 'Bitte zuerst eine Einkaufsliste auswählen.'
    return
  }

  const ingredients = []
  for (const day of MEAL_PLAN_DAYS) {
    const recipeId = days.value[day.key]
    if (!recipeId) continue
    const recipe = recipesById.value.get(recipeId)
    if (!recipe) continue
    ingredients.push(...recipe.ingredients)
  }

  if (ingredients.length === 0) {
    generationError.value = 'Im Wochenplan sind noch keine Rezepte hinterlegt.'
    return
  }

  generating.value = true
  try {
    const result = await generateItemsFromIngredients(selectedListId.value, ingredients, weekKey.value)
    generationMessage.value = `${result.added} Artikel hinzugefügt, ${result.skipped} bereits vorhanden.`
  } catch (err: any) {
    generationError.value = err.message || 'Einkaufsliste konnte nicht generiert werden.'
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <section class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <button
          @click="shiftWeek(-1)"
          class="px-3 py-2 text-sm rounded-xl border border-slate-600 text-slate-200 hover:border-slate-500"
        >
          ← Vorherige
        </button>
        <div class="text-center">
          <p class="text-xs text-slate-400 uppercase tracking-wide">Woche</p>
          <p class="text-sm font-semibold text-slate-100">{{ weekLabel }}</p>
        </div>
        <button
          @click="shiftWeek(1)"
          class="px-3 py-2 text-sm rounded-xl border border-slate-600 text-slate-200 hover:border-slate-500"
        >
          Nächste →
        </button>
      </div>

      <button
        @click="goToCurrentWeek"
        class="w-full py-2 text-sm rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
      >
        Zur aktuellen Woche
      </button>
    </section>

    <section class="space-y-2">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">Rezepte pro Tag</h3>
      <p v-if="loading" class="text-sm text-slate-500 py-2">Laden...</p>
      <p v-if="error" class="text-sm text-red-400 py-2">{{ error }}</p>

      <div v-for="day in MEAL_PLAN_DAYS" :key="day.key" class="bg-slate-800 rounded-2xl border border-slate-700 p-4">
        <p class="text-sm font-semibold text-slate-200 mb-2">{{ day.label }}</p>
        <select
          :value="days[day.key] || ''"
          @change="handleRecipeChange(day.key, ($event.target as HTMLSelectElement).value)"
          class="w-full px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        >
          <option value="">Kein Rezept</option>
          <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
            {{ recipe.title }}
          </option>
        </select>
      </div>
    </section>

    <section class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">
        Einkaufsliste aus Wochenplan
      </h3>

      <select
        v-model="selectedListId"
        class="w-full px-3 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-700 text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
      >
        <option value="" disabled>Liste auswählen</option>
        <option v-for="list in lists" :key="list.id" :value="list.id">
          {{ list.title }}
        </option>
      </select>

      <button
        @click="handleGenerateShoppingList"
        :disabled="generating || !selectedListId"
        class="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {{ generating ? 'Generiere...' : 'Einkaufsliste generieren' }}
      </button>

      <p v-if="generationMessage" class="text-sm text-green-400">{{ generationMessage }}</p>
      <p v-if="generationError" class="text-sm text-red-400">{{ generationError }}</p>
    </section>
  </div>
</template>

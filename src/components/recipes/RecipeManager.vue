<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRecipes } from '@/composables/useRecipes'
import type { RecipeIngredient } from '@/types'

interface IngredientFormRow {
  name: string
  amount: string
  unit: string
}

const props = defineProps<{
  coupleId: string
}>()

const coupleIdRef = computed<string | null>(() => props.coupleId)
const { recipes, loading, error, addRecipe, updateRecipe, deleteRecipe } = useRecipes(coupleIdRef)

const editingRecipeId = ref<string | null>(null)
const title = ref('')
const instructions = ref('')
const formError = ref<string | null>(null)
const ingredientRows = ref<IngredientFormRow[]>([
  { name: '', amount: '', unit: '' }
])

function resetForm() {
  editingRecipeId.value = null
  title.value = ''
  instructions.value = ''
  formError.value = null
  ingredientRows.value = [{ name: '', amount: '', unit: '' }]
}

function addIngredientRow() {
  ingredientRows.value.push({ name: '', amount: '', unit: '' })
}

function removeIngredientRow(index: number) {
  if (ingredientRows.value.length === 1) {
    ingredientRows.value[0] = { name: '', amount: '', unit: '' }
    return
  }
  ingredientRows.value.splice(index, 1)
}

function startEdit(recipe: {
  id: string
  title: string
  instructions: string
  ingredients: readonly RecipeIngredient[]
}) {
  editingRecipeId.value = recipe.id
  title.value = recipe.title
  instructions.value = recipe.instructions
  ingredientRows.value = recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    amount: String(ingredient.amount),
    unit: ingredient.unit
  }))
}

async function handleDelete(recipeId: string) {
  await deleteRecipe(recipeId)
  if (editingRecipeId.value === recipeId) {
    resetForm()
  }
}

function normalizeIngredients(): RecipeIngredient[] | null {
  const normalized = ingredientRows.value
    .map((row) => ({
      name: row.name.trim(),
      unit: row.unit.trim(),
      amount: Number(String(row.amount).replace(',', '.'))
    }))
    .filter((row) => row.name.length > 0)

  if (normalized.length === 0) {
    formError.value = 'Bitte mindestens eine Zutat eintragen.'
    return null
  }

  for (const ingredient of normalized) {
    if (!ingredient.unit) {
      formError.value = 'Bitte pro Zutat eine Einheit angeben.'
      return null
    }
    if (!Number.isFinite(ingredient.amount) || ingredient.amount <= 0) {
      formError.value = 'Bitte pro Zutat eine gültige Menge größer 0 angeben.'
      return null
    }
  }

  return normalized
}

async function handleSubmit() {
  formError.value = null
  const cleanTitle = title.value.trim()
  const cleanInstructions = instructions.value.trim()
  const normalizedIngredients = normalizeIngredients()

  if (!cleanTitle) {
    formError.value = 'Bitte einen Titel eingeben.'
    return
  }

  if (!cleanInstructions) {
    formError.value = 'Bitte die Zubereitung eintragen.'
    return
  }

  if (!normalizedIngredients) {
    return
  }

  const payload = {
    title: cleanTitle,
    ingredients: normalizedIngredients,
    instructions: cleanInstructions
  }

  if (editingRecipeId.value) {
    await updateRecipe(editingRecipeId.value, payload)
  } else {
    await addRecipe(payload)
  }

  resetForm()
}

function formatIngredient(ingredient: RecipeIngredient): string {
  return `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`
}
</script>

<template>
  <div class="space-y-4">
    <form @submit.prevent="handleSubmit" class="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">
          {{ editingRecipeId ? 'Rezept bearbeiten' : 'Rezept erstellen' }}
        </h3>
        <button
          v-if="editingRecipeId"
          type="button"
          @click="resetForm"
          class="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Abbrechen
        </button>
      </div>

      <input
        v-model="title"
        type="text"
        placeholder="Rezepttitel"
        class="w-full px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
      />

      <div class="space-y-2">
        <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Zutaten</p>

        <div
          v-for="(row, index) in ingredientRows"
          :key="index"
          class="grid grid-cols-12 gap-2"
        >
          <input
            v-model="row.name"
            type="text"
            placeholder="Name"
            class="col-span-5 px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <input
            v-model="row.amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Menge"
            class="col-span-3 px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <input
            v-model="row.unit"
            type="text"
            placeholder="Einheit"
            class="col-span-3 px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <button
            type="button"
            @click="removeIngredientRow(index)"
            class="col-span-1 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
            aria-label="Zutat entfernen"
          >
            ×
          </button>
        </div>

        <button
          type="button"
          @click="addIngredientRow"
          class="text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          + Zutat hinzufügen
        </button>
      </div>

      <textarea
        v-model="instructions"
        rows="4"
        placeholder="Zubereitungsschritte"
        class="w-full px-3 py-2.5 border border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
      />

      <p v-if="formError" class="text-sm text-red-400">{{ formError }}</p>
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        class="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
      >
        {{ editingRecipeId ? 'Änderungen speichern' : 'Rezept speichern' }}
      </button>
    </form>

    <div class="space-y-2">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide">Rezepte</h3>

      <p v-if="loading" class="text-center text-slate-500 text-sm py-4">Laden...</p>

      <div v-else-if="recipes.length === 0" class="text-center py-8 text-sm text-slate-500">
        Noch keine Rezepte vorhanden.
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="recipe in recipes"
          :key="recipe.id"
          class="bg-slate-800 rounded-2xl border border-slate-700 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <h4 class="text-base font-semibold text-slate-100">{{ recipe.title }}</h4>
            <div class="flex items-center gap-2">
              <button
                @click="startEdit(recipe)"
                class="text-xs text-slate-300 hover:text-green-300 transition-colors"
              >
                Bearbeiten
              </button>
              <button
                @click="handleDelete(recipe.id)"
                class="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>

          <div class="mt-3">
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Zutaten</p>
            <ul class="space-y-1 text-sm text-slate-200">
              <li v-for="(ingredient, index) in recipe.ingredients" :key="index">
                {{ formatIngredient(ingredient) }}
              </li>
            </ul>
          </div>

          <div class="mt-3">
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Zubereitung</p>
            <p class="text-sm text-slate-300 whitespace-pre-line">{{ recipe.instructions }}</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

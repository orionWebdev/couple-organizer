<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonButton,
  IonInput,
  IonTextarea,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner
} from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
import { useRecipes } from '@/composables/useRecipes'
import type { RecipeIngredient } from '@/types'
import AppFloatingActionButton from '@/components/ui/AppFloatingActionButton.vue'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'

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
const showFormModal = ref(false)

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
  showFormModal.value = true
}

function openNewRecipe() {
  resetForm()
  showFormModal.value = true
}

async function handleDelete(recipeId: string) {
  await deleteRecipe(recipeId)
  if (editingRecipeId.value === recipeId) {
    resetForm()
    showFormModal.value = false
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
  showFormModal.value = false
}

function formatIngredient(ingredient: RecipeIngredient): string {
  return `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`
}
</script>

<template>
  <div class="space-y-4">
    <!-- Recipe list -->
    <div v-if="loading" class="flex justify-center py-8">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <div v-else-if="recipes.length === 0" class="text-center py-8 text-sm text-slate-500">
      Noch keine Rezepte vorhanden.
    </div>

    <div v-else class="space-y-3">
      <ion-card v-for="recipe in recipes" :key="recipe.id">
        <ion-card-header>
          <div class="flex items-start justify-between gap-3">
            <ion-card-title class="text-base font-semibold">{{ recipe.title }}</ion-card-title>
            <div class="flex items-center gap-1 shrink-0">
              <ion-button fill="clear" size="small" @click="startEdit(recipe)">
                Bearbeiten
              </ion-button>
              <ion-button fill="clear" size="small" color="danger" @click="handleDelete(recipe.id)">
                Löschen
              </ion-button>
            </div>
          </div>
        </ion-card-header>
        <ion-card-content>
          <div class="mb-3">
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Zutaten</p>
            <ul class="space-y-1 text-sm text-slate-200">
              <li v-for="(ingredient, index) in recipe.ingredients" :key="index">
                {{ formatIngredient(ingredient) }}
              </li>
            </ul>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Zubereitung</p>
            <p class="text-sm text-slate-300 whitespace-pre-line">{{ recipe.instructions }}</p>
          </div>
        </ion-card-content>
      </ion-card>
    </div>

    <p v-if="error" class="text-sm text-red-400 text-center">{{ error }}</p>

    <!-- FAB to add recipe -->
    <AppFloatingActionButton :icon="addOutline" aria-label="Rezept hinzufügen" @click="openNewRecipe" />

    <AppSheetModal
      :is-open="showFormModal"
      :title="editingRecipeId ? 'Rezept bearbeiten' : 'Neues Rezept'"
      variant="fullscreen"
      close-label="Abbrechen"
      @close="showFormModal = false"
    >
      <div class="space-y-4">
        <ion-input
          v-model="title"
          placeholder="Rezepttitel"
          fill="outline"
          label="Titel"
          label-placement="floating"
          :clear-input="true"
        />

        <div class="space-y-2">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Zutaten</p>

          <div
            v-for="(row, index) in ingredientRows"
            :key="index"
            class="flex gap-2 items-center"
          >
            <ion-input
              v-model="row.name"
              placeholder="Name"
              fill="outline"
              class="flex-1"
            />
            <ion-input
              v-model="row.amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Menge"
              fill="outline"
              class="max-w-20"
            />
            <ion-input
              v-model="row.unit"
              placeholder="Einheit"
              fill="outline"
              class="max-w-20"
            />
            <ion-button
              fill="clear"
              size="small"
              color="danger"
              @click="removeIngredientRow(index)"
            >
              ×
            </ion-button>
          </div>

          <ion-button fill="clear" size="small" @click="addIngredientRow">
            + Zutat hinzufügen
          </ion-button>
        </div>

        <ion-textarea
          v-model="instructions"
          :rows="6"
          placeholder="Zubereitungsschritte"
          fill="outline"
          label="Zubereitung"
          label-placement="floating"
        />

        <p v-if="formError" class="text-sm text-red-400">{{ formError }}</p>

        <ion-button expand="block" @click="handleSubmit">
          Speichern
        </ion-button>
      </div>
    </AppSheetModal>
  </div>
</template>

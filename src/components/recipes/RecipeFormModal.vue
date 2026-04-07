<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  IonInput,
  IonTextarea,
  IonSpinner
} from '@ionic/vue'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import type { Recipe, RecipeCategory, RecipeIngredient } from '@/types'

interface IngredientRow {
  name: string
  amount: string
  unit: string
}

const props = defineProps<{
  isOpen: boolean
  recipe: Readonly<Recipe> | null
  categories: ReadonlyArray<RecipeCategory>
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: {
    title: string
    ingredients: RecipeIngredient[]
    instructions: string
    categories: string[]
    image: string
    isFavorite: boolean
    cookingTime: number | undefined
  }]
}>()

const title = ref('')
const instructions = ref('')
const image = ref('')
const isFavorite = ref(false)
const cookingTime = ref('')
const selectedCategoryIds = ref<string[]>([])
const ingredientRows = ref<IngredientRow[]>([{ name: '', amount: '', unit: '' }])
const formError = ref<string | null>(null)
const saving = ref(false)

watch(() => props.isOpen, (open) => {
  if (!open) return
  formError.value = null
  saving.value = false
  if (props.recipe) {
    title.value = props.recipe.title
    instructions.value = props.recipe.instructions
    image.value = props.recipe.image ?? ''
    isFavorite.value = props.recipe.isFavorite
    cookingTime.value = props.recipe.cookingTime ? String(props.recipe.cookingTime) : ''
    selectedCategoryIds.value = [...(props.recipe.categories ?? [])]
    ingredientRows.value = props.recipe.ingredients.map((i) => ({
      name: i.name,
      amount: String(i.amount),
      unit: i.unit
    }))
    if (ingredientRows.value.length === 0) ingredientRows.value = [{ name: '', amount: '', unit: '' }]
  } else {
    title.value = ''
    instructions.value = ''
    image.value = ''
    isFavorite.value = false
    cookingTime.value = ''
    selectedCategoryIds.value = []
    ingredientRows.value = [{ name: '', amount: '', unit: '' }]
  }
})

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

function toggleCategory(id: string) {
  const idx = selectedCategoryIds.value.indexOf(id)
  if (idx === -1) {
    selectedCategoryIds.value.push(id)
  } else {
    selectedCategoryIds.value.splice(idx, 1)
  }
}

async function handleSubmit() {
  formError.value = null
  const cleanTitle = title.value.trim()
  if (!cleanTitle) { formError.value = 'Bitte einen Titel eingeben.'; return }

  const normalized = ingredientRows.value
    .map((r) => ({
      name: r.name.trim(),
      unit: r.unit.trim(),
      amount: Number(String(r.amount).replace(',', '.'))
    }))
    .filter((r) => r.name.length > 0)

  if (normalized.length === 0) { formError.value = 'Bitte mindestens eine Zutat eintragen.'; return }
  for (const i of normalized) {
    if (!i.unit) { formError.value = 'Bitte pro Zutat eine Einheit angeben.'; return }
    if (!Number.isFinite(i.amount) || i.amount <= 0) { formError.value = 'Bitte eine gültige Menge > 0 angeben.'; return }
  }

  if (!instructions.value.trim()) { formError.value = 'Bitte die Zubereitung eintragen.'; return }

  const ct = cookingTime.value ? parseInt(cookingTime.value) : undefined

  saving.value = true
  emit('submit', {
    title: cleanTitle,
    ingredients: normalized,
    instructions: instructions.value.trim(),
    categories: selectedCategoryIds.value,
    image: image.value.trim(),
    isFavorite: isFavorite.value,
    cookingTime: ct && ct > 0 ? ct : undefined
  })
  saving.value = false
}
</script>

<template>
  <AppSheetModal
    :is-open="isOpen"
    :title="recipe ? 'Rezept bearbeiten' : 'Neues Rezept'"
    variant="fullscreen"
    close-label="Abbrechen"
    @close="emit('close')"
  >
    <div class="form-body">
      <!-- Title -->
      <div class="form-field">
        <label class="field-label">Titel</label>
        <ion-input
          v-model="title"
          placeholder="z.B. Pasta Carbonara"
          fill="outline"
          :clear-input="true"
        />
      </div>

      <!-- Categories -->
      <div class="form-field" v-if="categories.length > 0">
        <label class="field-label">Kategorien</label>
        <div class="cat-chips">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :class="{ 'cat-chip--active': selectedCategoryIds.includes(cat.id) }"
            @click="toggleCategory(cat.id)"
          >
            <span v-if="cat.icon" class="cat-chip-icon">{{ cat.icon }}</span>
            {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- Cooking time + Favorite row -->
      <div class="form-row">
        <div class="form-field flex-1">
          <label class="field-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Zeit (Min)
          </label>
          <ion-input
            v-model="cookingTime"
            type="number"
            placeholder="30"
            fill="outline"
            min="1"
          />
        </div>
        <div class="form-field fav-field">
          <label class="field-label">Favorit</label>
          <button
            class="fav-toggle"
            :class="{ 'fav-toggle--active': isFavorite }"
            @click="isFavorite = !isFavorite"
          >
            {{ isFavorite ? '★ Ja' : '☆ Nein' }}
          </button>
        </div>
      </div>

      <!-- Image URL -->
      <div class="form-field">
        <label class="field-label">Bild-URL (optional)</label>
        <ion-input
          v-model="image"
          placeholder="https://…"
          fill="outline"
          inputmode="url"
          :clear-input="true"
        />
      </div>

      <!-- Ingredients -->
      <div class="form-field">
        <label class="field-label">Zutaten</label>
        <div class="ingredient-list">
          <div
            v-for="(row, index) in ingredientRows"
            :key="index"
            class="ingredient-row"
          >
            <ion-input
              v-model="row.name"
              placeholder="Name"
              fill="outline"
              class="ingredient-name"
            />
            <ion-input
              v-model="row.amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Menge"
              fill="outline"
              class="ingredient-amount"
            />
            <ion-input
              v-model="row.unit"
              placeholder="Einh."
              fill="outline"
              class="ingredient-unit"
            />
            <button class="ingredient-remove" @click="removeIngredientRow(index)">×</button>
          </div>
        </div>
        <button class="add-ingredient-btn" @click="addIngredientRow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Zutat hinzufügen
        </button>
      </div>

      <!-- Instructions -->
      <div class="form-field">
        <label class="field-label">Zubereitung</label>
        <ion-textarea
          v-model="instructions"
          :rows="5"
          placeholder="Schritt für Schritt..."
          fill="outline"
        />
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <button class="submit-btn" :disabled="saving" @click="handleSubmit">
        <ion-spinner v-if="saving" name="crescent" class="btn-spinner" />
        <template v-else>{{ recipe ? 'Speichern' : 'Rezept erstellen' }}</template>
      </button>
    </div>
  </AppSheetModal>
</template>

<style scoped>
.form-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.flex-1 { flex: 1; }

.field-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

/* Category chips */
.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.7);
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.14s;
}

.cat-chip--active {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.5);
  color: #4ade80;
}

.cat-chip-icon {
  font-size: 0.875rem;
}

/* Favorite toggle */
.fav-field { flex-shrink: 0; }

.fav-toggle {
  padding: 0.6rem 1rem;
  border-radius: 0.875rem;
  border: 1px solid rgba(71, 85, 105, 0.7);
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
  transition: all 0.14s;
}

.fav-toggle--active {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.45);
  color: #fbbf24;
}

/* Ingredients */
.ingredient-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ingredient-row {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.ingredient-name  { flex: 2; }
.ingredient-amount { flex: 1; min-width: 0; }
.ingredient-unit  { flex: 1; min-width: 0; }

.ingredient-remove {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.ingredient-remove:active {
  background: rgba(239, 68, 68, 0.22);
}

.add-ingredient-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border: 1px dashed rgba(71, 85, 105, 0.6);
  border-radius: 0.75rem;
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s, color 0.12s;
}

.add-ingredient-btn:active {
  color: var(--app-text);
  border-color: rgba(71, 85, 105, 0.9);
}

/* Form error */
.form-error {
  font-size: 0.8125rem;
  color: #f87171;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 0.625rem;
  border: 1px solid rgba(239, 68, 68, 0.22);
}

/* Submit button */
.submit-btn {
  width: 100%;
  padding: 0.9375rem;
  background: var(--app-primary);
  color: #fff;
  font-family: var(--ion-font-family);
  font-weight: 700;
  font-size: 1rem;
  border: 0;
  border-radius: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, transform 0.1s;
}

.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn:active:not(:disabled) { transform: scale(0.98); background: var(--app-primary-strong); }

.btn-spinner { width: 1.25rem; height: 1.25rem; }
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonSpinner } from '@ionic/vue'
import { MEAL_PLAN_DAYS, MEAL_TYPES, useMealPlan } from '@/composables/useMealPlan'
import { useRecipes } from '@/composables/useRecipes'
import { useRecipeCategories } from '@/composables/useRecipeCategories'
import { useShopping } from '@/composables/useShopping'
import AppSheetModal from '@/components/ui/AppSheetModal.vue'
import MealPlanRecipePicker from './MealPlanRecipePicker.vue'
import type { MealPlanDayKey, MealType } from '@/types'

const props = defineProps<{ coupleId: string }>()

const coupleIdRef = computed<string | null>(() => props.coupleId)

const { recipes, markAsUsed } = useRecipes(coupleIdRef)
const { categories } = useRecipeCategories(coupleIdRef)
const { weekLabel, weekKey, days, loading, filledSlots, totalSlots, shiftWeek, goToCurrentWeek, setMealForDay } = useMealPlan(coupleIdRef)
const { lists, generateItemsFromIngredients } = useShopping(coupleIdRef)

// ── Picker state ────────────────────────────────────────────
const pickerOpen = ref(false)
const pickerDay = ref<MealPlanDayKey>('monday')
const pickerMealType = ref<MealType>('dinner')

// ── Generate shopping list ──────────────────────────────────
const showGenerateModal = ref(false)
const selectedListId = ref('')
const generationMessage = ref<string | null>(null)
const generationError = ref<string | null>(null)
const generating = ref(false)

watch(lists, (l) => {
  if (l.length === 0) { selectedListId.value = ''; return }
  if (!selectedListId.value || !l.some((x) => x.id === selectedListId.value)) {
    selectedListId.value = l[0].id
  }
}, { immediate: true })

const recipesById = computed(() => {
  const map = new Map<string, (typeof recipes.value)[number]>()
  for (const r of recipes.value) map.set(r.id, r)
  return map
})

const currentPickerRecipeId = computed(() => {
  const dayMeals = days.value[pickerDay.value]
  return dayMeals?.[pickerMealType.value] ?? null
})

const plannedDays = computed(() =>
  MEAL_PLAN_DAYS.filter((d) => {
    const dm = days.value[d.key]
    return dm.breakfast || dm.lunch || dm.dinner
  }).length
)

const ingredientsForWeek = computed(() => {
  const ingredients: any[] = []
  for (const day of MEAL_PLAN_DAYS) {
    const dm = days.value[day.key]
    for (const meal of MEAL_TYPES) {
      const recipeId = dm[meal.key]
      if (!recipeId) continue
      const recipe = recipesById.value.get(recipeId)
      if (!recipe) continue
      ingredients.push(...recipe.ingredients)
    }
  }
  return ingredients
})

function openPicker(day: MealPlanDayKey, mealType: MealType) {
  pickerDay.value = day
  pickerMealType.value = mealType
  pickerOpen.value = true
}

async function handlePickerSelect(recipeId: string | null) {
  await setMealForDay(pickerDay.value, pickerMealType.value, recipeId)
  if (recipeId) await markAsUsed(recipeId)
  pickerOpen.value = false
}

function getMealRecipe(day: MealPlanDayKey, mealType: MealType) {
  const recipeId = days.value[day]?.[mealType]
  if (!recipeId) return null
  return recipesById.value.get(recipeId) ?? null
}

async function handleGenerateShoppingList() {
  generationMessage.value = null
  generationError.value = null
  if (!selectedListId.value) { generationError.value = 'Bitte eine Einkaufsliste auswählen.'; return }
  if (ingredientsForWeek.value.length === 0) { generationError.value = 'Keine Rezepte im Plan vorhanden.'; return }

  generating.value = true
  try {
    const result = await generateItemsFromIngredients(selectedListId.value, ingredientsForWeek.value, weekKey.value)
    generationMessage.value = `${result.added} Artikel hinzugefügt${result.skipped > 0 ? `, ${result.skipped} bereits vorhanden` : ''}.`
  } catch (err: any) {
    generationError.value = err.message || 'Fehler beim Generieren.'
  } finally {
    generating.value = false
  }
}

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
}

const MEAL_ICON: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
}
</script>

<template>
  <div class="meal-board">

    <!-- ── Week navigation ────────────────────────────────── -->
    <div class="week-nav panel-surface">
      <button class="nav-arrow" @click="shiftWeek(-1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="week-nav-center">
        <p class="week-nav-label">Woche</p>
        <p class="week-nav-range">{{ weekLabel }}</p>
        <button class="week-today-btn" @click="goToCurrentWeek">Heute</button>
      </div>
      <button class="nav-arrow" @click="shiftWeek(1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <!-- ── Progress + Shopping trigger ───────────────────── -->
    <div class="week-progress panel-surface">
      <div class="progress-top">
        <div class="progress-label-wrap">
          <span class="progress-label">
            📅 {{ filledSlots }} / {{ totalSlots }} Mahlzeiten
          </span>
          <span class="progress-days-hint" v-if="plannedDays > 0">
            ({{ plannedDays }} {{ plannedDays === 1 ? 'Tag' : 'Tage' }})
          </span>
        </div>
        <button
          v-if="filledSlots > 0 && lists.length > 0"
          class="shopping-trigger"
          @click="showGenerateModal = true"
        >
          🛒 Einkaufsliste
        </button>
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: `${(filledSlots / totalSlots) * 100}%` }"
        />
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────── -->
    <div v-if="loading" class="flex justify-center py-8">
      <ion-spinner name="crescent" color="primary" />
    </div>

    <!-- ── Day cards ──────────────────────────────────────── -->
    <div v-if="!loading" class="days-list">
      <div
        v-for="day in MEAL_PLAN_DAYS"
        :key="day.key"
        class="day-card panel-surface"
      >
        <!-- Day header -->
        <div class="day-header">
          <span class="day-name">{{ day.label }}</span>
          <div class="day-dots">
            <span
              v-for="meal in MEAL_TYPES"
              :key="meal.key"
              class="day-dot"
              :class="{ 'day-dot--filled': !!days[day.key]?.[meal.key] }"
            />
          </div>
        </div>

        <!-- Meal slots -->
        <div class="meal-slots">
          <button
            v-for="meal in MEAL_TYPES"
            :key="meal.key"
            class="meal-slot"
            :class="{
              'meal-slot--filled': !!days[day.key]?.[meal.key],
              'meal-slot--last': meal.key === 'dinner'
            }"
            @click="openPicker(day.key, meal.key)"
          >
            <span class="meal-icon">{{ MEAL_ICON[meal.key] }}</span>
            <div class="meal-info">
              <span class="meal-type-label">{{ MEAL_LABEL[meal.key] }}</span>
              <span
                v-if="getMealRecipe(day.key, meal.key)"
                class="meal-recipe-name"
              >
                {{ getMealRecipe(day.key, meal.key)?.title }}
              </span>
              <span v-else class="meal-empty-hint">Hinzufügen…</span>
            </div>
            <span v-if="getMealRecipe(day.key, meal.key)" class="meal-check">✓</span>
            <span v-else class="meal-plus">+</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Recipe picker sheet ────────────────────────────── -->
    <MealPlanRecipePicker
      :is-open="pickerOpen"
      :recipes="recipes"
      :categories="categories"
      :meal-type="pickerMealType"
      :current-recipe-id="currentPickerRecipeId"
      @close="pickerOpen = false"
      @select="handlePickerSelect"
    />

    <!-- ── Generate shopping list sheet ──────────────────── -->
    <AppSheetModal
      :is-open="showGenerateModal"
      title="Einkaufsliste generieren"
      :breakpoints="[0, 0.55, 0.72]"
      :initial-breakpoint="0.55"
      close-label="Schließen"
      @close="showGenerateModal = false"
    >
      <div class="generate-body">
        <p class="generate-info">
          {{ ingredientsForWeek.length }} Zutaten aus {{ filledSlots }}
          {{ filledSlots === 1 ? 'Mahlzeit' : 'Mahlzeiten' }} zusammenführen.
        </p>

        <div class="list-selector">
          <p class="list-selector-label">Liste auswählen</p>
          <div class="list-chips">
            <button
              v-for="list in lists"
              :key="list.id"
              class="list-chip"
              :class="{ 'list-chip--active': selectedListId === list.id }"
              @click="selectedListId = list.id"
            >
              {{ list.title }}
            </button>
          </div>
        </div>

        <button
          class="generate-btn"
          :disabled="generating || !selectedListId"
          @click="handleGenerateShoppingList"
        >
          <ion-spinner v-if="generating" name="crescent" class="btn-spinner" />
          <template v-else>🛒 Zur Einkaufsliste hinzufügen</template>
        </button>

        <p v-if="generationMessage" class="gen-msg gen-msg--ok">{{ generationMessage }}</p>
        <p v-if="generationError" class="gen-msg gen-msg--err">{{ generationError }}</p>
      </div>
    </AppSheetModal>

  </div>
</template>

<style scoped>
.meal-board {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* ── Week nav ─────────────────────────────────────────────── */
.week-nav {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.875rem;
  gap: 0.5rem;
}

.nav-arrow {
  width: 2.375rem;
  height: 2.375rem;
  border-radius: 9999px;
  border: 1px solid rgba(71, 85, 105, 0.65);
  background: transparent;
  color: var(--app-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s, color 0.14s;
}

.nav-arrow:active {
  background: rgba(71, 85, 105, 0.3);
  color: var(--app-text);
}

.week-nav-center {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.week-nav-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0;
}

.week-nav-range {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}

.week-today-btn {
  font-size: 0.97rem;
  color: var(--app-primary);
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

/* ── Progress ─────────────────────────────────────────────── */
.week-progress {
  padding: 0.75rem 0.875rem;
}

.progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-label-wrap {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.progress-label {
  font-size: 1.0625rem;
  font-weight: 500;
  color: var(--app-text-muted);
}

.progress-days-hint {
  font-size: 0.97rem;
  color: #475569;
  font-weight: 500;
}

.shopping-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.75rem;
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 9999px;
  font-family: var(--ion-font-family);
  font-size: 1.03rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s;
}

.shopping-trigger:active { background: rgba(34, 197, 94, 0.2); }

.progress-track {
  height: 0.3125rem;
  background: rgba(51, 65, 85, 0.72);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--app-primary), #4ade80);
  border-radius: 9999px;
  transition: width 0.35s ease;
}

/* ── Days list ────────────────────────────────────────────── */
.days-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Day card ─────────────────────────────────────────────── */
.day-card {
  overflow: hidden;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem 0.5rem;
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
}

.day-name {
  font-size: 0.97rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.day-dots {
  display: flex;
  gap: 0.3rem;
}

.day-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: rgba(71, 85, 105, 0.5);
  transition: background 0.2s;
}

.day-dot--filled {
  background: var(--app-primary);
}

/* ── Meal slots ───────────────────────────────────────────── */
.meal-slots {
  display: flex;
  flex-direction: column;
}

.meal-slot {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  padding: 0.625rem 0.875rem;
  border: none;
  background: transparent;
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.meal-slot:last-child {
  border-bottom: none;
}

.meal-slot:active {
  background: rgba(71, 85, 105, 0.12);
}

.meal-slot--filled {
  /* subtle green tint on filled slots */
}

.meal-icon {
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
  width: 1.25rem;
  text-align: center;
}

.meal-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.075rem;
}

.meal-type-label {
  font-size: 0.93rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meal-recipe-name {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meal-empty-hint {
  font-size: 1.05rem;
  color: #334155;
  font-weight: 400;
}

.meal-check {
  font-size: 1.125rem;
  color: var(--app-primary);
  font-weight: 700;
  flex-shrink: 0;
}

.meal-plus {
  font-size: 1.375rem;
  color: #334155;
  font-weight: 400;
  flex-shrink: 0;
}

/* ── Generate sheet ───────────────────────────────────────── */
.generate-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1rem;
}

.generate-info {
  font-size: 1.125rem;
  color: var(--app-text-muted);
  margin: 0;
}

.list-selector-label {
  font-size: 0.97rem;
  font-weight: 700;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 0.5rem;
}

.list-chips {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.list-chip {
  padding: 0.375rem 0.875rem;
  border: 1px solid rgba(71, 85, 105, 0.65);
  border-radius: 9999px;
  background: transparent;
  color: var(--app-text-muted);
  font-family: var(--ion-font-family);
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.14s;
}

.list-chip--active {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.45);
  color: #4ade80;
}

.generate-btn {
  width: 100%;
  padding: 0.9375rem;
  background: var(--app-primary);
  color: #fff;
  font-family: var(--ion-font-family);
  font-weight: 700;
  font-size: 1.25rem;
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

.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.generate-btn:active:not(:disabled) { transform: scale(0.98); background: var(--app-primary-strong); }

.btn-spinner { width: 1.25rem; height: 1.25rem; }

.gen-msg {
  font-size: 1.0625rem;
  text-align: center;
  margin: 0;
}
.gen-msg--ok { color: #4ade80; }
.gen-msg--err { color: #f87171; }
</style>

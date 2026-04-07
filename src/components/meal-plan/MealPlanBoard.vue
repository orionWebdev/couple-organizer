<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonButtons,
  IonToolbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonIcon
} from '@ionic/vue'
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons'
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
    <!-- Week navigation -->
    <ion-card>
      <ion-card-content>
        <ion-toolbar class="--background: transparent">
          <ion-buttons slot="start">
            <ion-button @click="shiftWeek(-1)">
              <ion-icon :icon="chevronBackOutline" slot="icon-only" />
            </ion-button>
          </ion-buttons>
          <div class="text-center">
            <p class="text-xs text-slate-400 uppercase tracking-wide">Woche</p>
            <p class="text-sm font-semibold">{{ weekLabel }}</p>
          </div>
          <ion-buttons slot="end">
            <ion-button @click="shiftWeek(1)">
              <ion-icon :icon="chevronForwardOutline" slot="icon-only" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        <ion-button expand="block" fill="outline" size="small" @click="goToCurrentWeek" class="mt-2">
          Zur aktuellen Woche
        </ion-button>
      </ion-card-content>
    </ion-card>

    <!-- Days -->
    <section class="space-y-2">
      <h3 class="font-semibold text-sm text-slate-400 uppercase tracking-wide px-1">Rezepte pro Tag</h3>

      <div v-if="loading" class="flex justify-center py-4">
        <ion-spinner name="crescent" color="primary" />
      </div>
      <p v-if="error" class="text-sm text-red-400 py-2">{{ error }}</p>

      <ion-card v-for="day in MEAL_PLAN_DAYS" :key="day.key">
        <ion-card-content>
          <p class="text-sm font-semibold mb-2">{{ day.label }}</p>
          <ion-select
            :value="days[day.key] || ''"
            @ion-change="handleRecipeChange(day.key, ($event.detail.value as string))"
            label="Rezept"
            label-placement="floating"
            fill="outline"
            interface="action-sheet"
          >
            <ion-select-option value="">Kein Rezept</ion-select-option>
            <ion-select-option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
              {{ recipe.title }}
            </ion-select-option>
          </ion-select>
        </ion-card-content>
      </ion-card>
    </section>

    <!-- Generate shopping list -->
    <ion-card>
      <ion-card-header>
        <ion-card-title class="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Einkaufsliste aus Wochenplan
        </ion-card-title>
      </ion-card-header>
      <ion-card-content class="space-y-3">
        <ion-select
          v-model="selectedListId"
          label="Liste auswählen"
          label-placement="floating"
          fill="outline"
          interface="action-sheet"
        >
          <ion-select-option v-for="list in lists" :key="list.id" :value="list.id">
            {{ list.title }}
          </ion-select-option>
        </ion-select>

        <ion-button
          expand="block"
          @click="handleGenerateShoppingList"
          :disabled="generating || !selectedListId"
        >
          {{ generating ? 'Generiere...' : 'Einkaufsliste generieren' }}
        </ion-button>

        <p v-if="generationMessage" class="text-sm text-green-400">{{ generationMessage }}</p>
        <p v-if="generationError" class="text-sm text-red-400">{{ generationError }}</p>
      </ion-card-content>
    </ion-card>
  </div>
</template>

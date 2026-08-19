<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Couple, Recipe } from '@/types'
import { useMealPlan, type WeekPlanDay, type WeekDay } from '@/composables/useMealPlan'
import { useShopping } from '@/composables/useShopping'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import MealPlanDayRow from './MealPlanDayRow.vue'
import RecipeSuggestSheet from './RecipeSuggestSheet.vue'
import RecipeDetailModal from './RecipeDetailModal.vue'
import AddToShoppingListSheet from './AddToShoppingListSheet.vue'
import KitchenAiSheet from './KitchenAiSheet.vue'
import AiButton from '@/components/ai/AiButton.vue'
import { weekdayLabel } from '@/utils/mealplan'

const props = defineProps<{
  coupleId: string | null
  couple: Couple | null
}>()

const coupleIdRef = computed(() => props.coupleId)

const { week, weekLabel, isCurrentWeek, shiftWeek, resetWeek, recipes, loading, canCreateRecipe, canPlanWeek, libraryFillCapacity, fillWeekFromLibrary, suggestRecipes, planWeek, applyWeekPlan, assignRecipe, assignExistingRecipe, removeAssignment } = useMealPlan(coupleIdRef)
const { lists: shoppingLists, activeListId, canCreateList, createList, setActiveList, addItem: addShoppingItem } = useShopping(coupleIdRef)

const hasAnyRecipe = computed(() => week.value.some((d) => d.recipe))

// assignRecipe legt immer ein neues Rezept-Doc an und fällt damit unters
// Rezept-Limit. Die Sheets bekommen deshalb diese Hülle statt assignRecipe
// direkt — sonst schlüge das Zuweisen still fehl.
async function assignWithPaywall(dateKey: string, input: Parameters<typeof assignRecipe>[1]) {
  if (!canCreateRecipe.value) {
    showPaywall('recipeCount')
    return false
  }
  return assignRecipe(dateKey, input)
}

// Tages-Schnellzuweisung (Klick auf einen leeren Tag): reiner Text oder
// Auswahl aus der bestehenden Rezept-Sammlung — keine KI hier.
const showSheet = ref(false)
const suggestDateKey = ref<string | null>(null)

// Der KI-Einstieg sitzt wieder auf diesem Screen: ein Auslöser über dem
// Wochenplan, der das KitchenAiSheet öffnet. Das Sheet bietet beide Aktionen
// (ganze Woche / einzelnes Rezept) selbst an — der frühere ?ai=-Umweg über den
// globalen Hub entfällt mitsamt dem Hub.
const showKitchenAi = ref(false)

async function onWeekApplied(payload: { count: number; days: WeekPlanDay[]; createList: boolean }) {
  showKitchenAi.value = false
  const { count, days, createList: createShoppingList } = payload
  let msg = count > 0 ? `Wochenplan eingeplant (${count} ${count === 1 ? 'Tag' : 'Tage'})` : 'Es wurde nichts eingeplant'

  // Einkaufsliste direkt aus den geplanten Vorschlägen bauen — nicht aus dem
  // reaktiven `week`, das nach dem Schreiben erst per Snapshot nachzieht.
  if (createShoppingList && count > 0) {
    const res = await writeIngredientsToList(activeListId.value, mergeIngredients(days.flatMap((d) => d.suggestion.ingredients)))
    if (res === 'ok') msg += ' · Einkaufsliste aktualisiert'
    else if (res === 'no-list') msg += ' · keine aktive Einkaufsliste'
  }
  showToast(msg)
}

// Aus der eigenen Sammlung gefüllt — kein KI-Aufruf. Die Zutaten stehen an den
// vorhandenen Rezepten, die Einkaufsliste holt sie sich über den regulären
// "Einkaufsliste aus Plan erstellen"-Knopf.
function onWeekFilled(count: number) {
  showKitchenAi.value = false
  showToast(
    count > 0
      ? `${count} ${count === 1 ? 'Tag' : 'Tage'} aus euren Rezepten eingeplant`
      : 'Es wurde nichts eingeplant'
  )
}

const detailRecipe = ref<Recipe | null>(null)
const showDetail = ref(false)

function openDetail(recipe: Recipe) {
  detailRecipe.value = recipe
  showDetail.value = true
}

const weekForSheet = computed(() => week.value.map((d) => ({
  date: d.date,
  dateKey: d.dateKey,
  recipeTitle: d.recipe?.title ?? null,
})))

function openDaySuggest(dateKey: string) {
  suggestDateKey.value = dateKey
  showSheet.value = true
}

async function handleRemove(entryId: string) {
  const ok = await removeAssignment(entryId)
  if (!ok) showToast('Fehler beim Entfernen')
}

function onAssigned(success: boolean) {
  showSheet.value = false
  showKitchenAi.value = false
  showToast(success ? 'Rezept eingeplant' : 'Fehler beim Einplanen')
}

interface AggregatedIngredient { name: string; amount?: number; unit?: string }

// Gleiche Zutaten (name + unit) zusammenfassen — genutzt vom Wochenplan-Button
// (aus den geplanten Rezepten) und vom Autopilot (aus den KI-Vorschlägen).
function mergeIngredients(items: readonly { name: string; amount?: number; unit?: string }[]): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>()
  for (const ing of items) {
    const key = `${ing.name.trim().toLowerCase()}__${(ing.unit ?? '').trim().toLowerCase()}`
    const existing = map.get(key)
    if (existing && typeof existing.amount === 'number' && typeof ing.amount === 'number') {
      existing.amount += ing.amount
    } else if (!existing) {
      map.set(key, { name: ing.name.trim(), amount: ing.amount, unit: ing.unit })
    }
  }
  return [...map.values()]
}

// Schreibt Zutaten in eine bestimmte Liste. Kein Toast hier — der Aufrufer
// formuliert die Meldung (der Autopilot hängt sie an seine eigene an).
async function writeIngredientsToList(
  listId: string | null,
  ingredients: AggregatedIngredient[]
): Promise<'ok' | 'empty' | 'no-list'> {
  if (ingredients.length === 0) return 'empty'
  if (!listId) return 'no-list'
  for (const ing of ingredients) {
    await addShoppingItem({ listId, name: ing.name, amount: ing.amount, unit: ing.unit, merge: true })
  }
  return 'ok'
}

// Ziel-Sheet: der Nutzer wählt (bzw. erstellt) die Liste, in die die gerade
// gesammelten Zutaten wandern. Sowohl ein einzelner Tag als auch die ganze
// Woche laufen hier zusammen — nur die Zutaten und der Untertitel wechseln.
const showListSheet = ref(false)
const pendingIngredients = ref<AggregatedIngredient[]>([])
const listSheetSubtitle = ref('')

function openDayToList(day: WeekDay) {
  if (!day.recipe) return
  pendingIngredients.value = mergeIngredients(day.recipe.ingredients ?? [])
  listSheetSubtitle.value = `${weekdayLabel(day.date)} · ${day.recipe.title}`
  showListSheet.value = true
}

function openWeekToList() {
  pendingIngredients.value = mergeIngredients(week.value.flatMap((d) => d.recipe?.ingredients ?? []))
  const dishCount = week.value.filter((d) => d.recipe).length
  listSheetSubtitle.value = `Ganze Woche · ${dishCount} ${dishCount === 1 ? 'Gericht' : 'Gerichte'}`
  showListSheet.value = true
}

async function onListChosen(listId: string) {
  showListSheet.value = false
  const res = await writeIngredientsToList(listId, pendingIngredients.value)
  if (res === 'ok') {
    // Die gewählte Liste aktiv setzen, damit der „Küche → Einkaufsliste"-Tab
    // gleich die richtige zeigt.
    setActiveList(listId)
    showToast('Einkaufsliste aktualisiert')
  } else if (res === 'empty') {
    showToast('Keine Zutaten zum Übernehmen')
  }
}
</script>

<template>
  <div class="essensplan">
    <div class="essensplan-scroll">
      <!-- Wochennavigation: vergangene/kommende Wochen sind weiter erreichbar,
           die Pläne liegen ohnehin dauerhaft in Firestore. -->
      <div class="week-nav">
        <button class="week-arrow" type="button" aria-label="Vorige Woche" @click="shiftWeek(-1)">‹</button>
        <button
          class="week-label"
          type="button"
          :class="{ 'week-label--past': !isCurrentWeek }"
          @click="resetWeek"
        >
          {{ weekLabel }}
          <span v-if="!isCurrentWeek" class="week-today-hint">· heute</span>
        </button>
        <button class="week-arrow" type="button" aria-label="Nächste Woche" @click="shiftWeek(1)">›</button>
      </div>

      <AiButton
        title="Wochenplan füllen"
        subtitle="Aus euren Rezepten oder mit KI"
        @click="showKitchenAi = true"
      />

      <div v-if="loading" class="loading-msg">Laden…</div>
      <div v-else class="day-list">
        <MealPlanDayRow
          v-for="day in week"
          :key="day.dateKey"
          :date="day.date"
          :dateKey="day.dateKey"
          :entry="day.entry"
          :recipe="day.recipe"
          @addRecipe="openDaySuggest"
          @remove="handleRemove"
          @open="openDetail"
          @addToList="openDayToList(day)"
        />
      </div>
    </div>

    <div class="cta-wrap">
      <button class="btn-primary" :disabled="!hasAnyRecipe" @click="openWeekToList">
        🛒 Einkaufsliste aus Plan erstellen
      </button>
    </div>

    <KitchenAiSheet
      :isOpen="showKitchenAi"
      :week="weekForSheet"
      :canPlanWeek="canPlanWeek"
      :plan="planWeek"
      :apply="applyWeekPlan"
      :suggest="suggestRecipes"
      :assign="assignWithPaywall"
      :libraryCapacity="libraryFillCapacity"
      :fillFromLibrary="fillWeekFromLibrary"
      @close="showKitchenAi = false"
      @applied="onWeekApplied"
      @assigned="onAssigned"
      @filled="onWeekFilled"
    />

    <RecipeSuggestSheet
      :isOpen="showSheet"
      :week="weekForSheet"
      :initialDateKey="suggestDateKey"
      :recipes="recipes"
      :assign="assignWithPaywall"
      :assignExisting="assignExistingRecipe"
      @close="showSheet = false"
      @assigned="onAssigned"
    />

    <RecipeDetailModal
      :isOpen="showDetail"
      :recipe="detailRecipe"
      @close="showDetail = false"
    />

    <AddToShoppingListSheet
      :isOpen="showListSheet"
      :subtitle="listSheetSubtitle"
      :lists="shoppingLists"
      :activeListId="activeListId"
      :canCreateList="canCreateList"
      :createList="createList"
      @close="showListSheet = false"
      @confirm="onListChosen"
    />
  </div>
</template>

<style scoped>
.essensplan {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.essensplan-scroll {
  flex: 1;
  overflow-y: auto;
  /* Nur vertikal scrollen — horizontale Gesten gehören dem Tab-Swipe. */
  touch-action: pan-y;
  padding: 0 var(--screen-pad);
}

/* Wochennavigation */
.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0 14px;
}

.week-arrow {
  flex: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-softer);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-card);
}

.week-arrow:active {
  transform: scale(0.94);
}

.week-label {
  flex: 1;
  min-width: 0;
  height: 40px;
  border: none;
  background: transparent;
  font-family: var(--font-headline);
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
}

.week-label--past {
  color: var(--accent);
}

.week-today-hint {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-meta);
}

.essensplan-scroll > .ai-btn {
  margin-bottom: 16px;
}

.loading-msg {
  padding: 40px var(--screen-pad);
  font-size: 14px;
  color: var(--text-faint);
  text-align: center;
}

.day-list {
  padding-bottom: 12px;
}

.cta-wrap {
  padding: 12px var(--screen-pad) calc(20px + var(--safe-bottom));
}
</style>

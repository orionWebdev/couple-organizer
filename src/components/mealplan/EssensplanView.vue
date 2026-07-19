<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Couple, Recipe } from '@/types'
import { useMealPlan, type WeekPlanDay } from '@/composables/useMealPlan'
import { useShopping } from '@/composables/useShopping'
import { showToast } from '@/composables/useToast'
import { showPaywall } from '@/composables/usePaywall'
import MealPlanDayRow from './MealPlanDayRow.vue'
import RecipeSuggestSheet from './RecipeSuggestSheet.vue'
import AiRecipeSheet from './AiRecipeSheet.vue'
import WeekAutopilotSheet from './WeekAutopilotSheet.vue'
import RecipeDetailModal from './RecipeDetailModal.vue'

const props = defineProps<{
  coupleId: string | null
  couple: Couple | null
}>()

const coupleIdRef = computed(() => props.coupleId)

const { week, recipes, loading, canCreateRecipe, canPlanWeek, suggestRecipes, planWeek, applyWeekPlan, assignRecipe, assignExistingRecipe, removeAssignment } = useMealPlan(coupleIdRef)
const { activeListId, addItem: addShoppingItem } = useShopping(coupleIdRef)

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

// Separates KI-Modal ("Rezept vorschlagen lassen"): freie Beschreibung,
// eigener animierter Ladezustand — bewusst getrennt von der Tages-Sheet oben.
const showAiModal = ref(false)

// Wochen-Autopilot (TwoDo Plus): plant die ganze Woche auf einen Tap. Gate
// vorab, damit die Paywall statt der Konfig-Maske aufgeht.
const showAutopilot = ref(false)

function openAutopilot() {
  if (!canPlanWeek.value) {
    showPaywall('weekPlan')
    return
  }
  showAutopilot.value = true
}

async function onWeekApplied(payload: { count: number; days: WeekPlanDay[]; createList: boolean }) {
  showAutopilot.value = false
  const { count, days, createList } = payload
  let msg = count > 0 ? `Wochenplan eingeplant (${count} ${count === 1 ? 'Tag' : 'Tage'})` : 'Es wurde nichts eingeplant'

  // Einkaufsliste direkt aus den geplanten Vorschlägen bauen — nicht aus dem
  // reaktiven `week`, das nach dem Schreiben erst per Snapshot nachzieht.
  if (createList && count > 0) {
    const res = await writeIngredientsToList(mergeIngredients(days.flatMap((d) => d.suggestion.ingredients)))
    if (res === 'ok') msg += ' · Einkaufsliste aktualisiert'
    else if (res === 'no-list') msg += ' · keine aktive Einkaufsliste'
  }
  showToast(msg)
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

const defaultSuggestDateKey = computed(() =>
  week.value.find((d) => !d.recipe)?.dateKey ?? week.value[0]?.dateKey ?? null
)

function openDaySuggest(dateKey: string) {
  suggestDateKey.value = dateKey
  showSheet.value = true
}

function openAiModal() {
  showAiModal.value = true
}

async function handleRemove(entryId: string) {
  const ok = await removeAssignment(entryId)
  if (!ok) showToast('Fehler beim Entfernen')
}

function onAssigned(success: boolean) {
  showSheet.value = false
  showAiModal.value = false
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

// Schreibt Zutaten in die aktive Liste. Kein Toast hier — der Aufrufer
// formuliert die Meldung (der Autopilot hängt sie an seine eigene an).
async function writeIngredientsToList(
  ingredients: AggregatedIngredient[]
): Promise<'ok' | 'empty' | 'no-list'> {
  if (ingredients.length === 0) return 'empty'
  if (!activeListId.value) return 'no-list'
  for (const ing of ingredients) {
    await addShoppingItem({ listId: activeListId.value, name: ing.name, amount: ing.amount, unit: ing.unit })
  }
  return 'ok'
}

async function handleCreateShoppingList() {
  const res = await writeIngredientsToList(mergeIngredients(week.value.flatMap((d) => d.recipe?.ingredients ?? [])))
  if (res === 'no-list') showToast('Bitte zuerst eine Einkaufsliste anlegen')
  else if (res === 'ok') showToast('Einkaufsliste aktualisiert')
}
</script>

<template>
  <div class="essensplan">
    <div class="essensplan-scroll">
      <button class="suggest-card autopilot-card" type="button" @click="openAutopilot">
        <span class="suggest-icon">🪄</span>
        <div class="suggest-text">
          <span class="suggest-title">
            Ganze Woche planen lassen
            <span v-if="!canPlanWeek" class="plus-tag">Plus</span>
          </span>
          <span class="suggest-sub">Ein Tap — Essensplan für die Woche steht</span>
        </div>
        <span class="suggest-chevron">›</span>
      </button>

      <button class="suggest-card" type="button" @click="openAiModal">
        <span class="suggest-icon">✨</span>
        <div class="suggest-text">
          <span class="suggest-title">Rezept vorschlagen lassen</span>
          <span class="suggest-sub">Idee für einen Tag? Frag einfach</span>
        </div>
        <span class="suggest-chevron">›</span>
      </button>

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
        />
      </div>
    </div>

    <div class="cta-wrap">
      <button class="btn-primary" :disabled="!hasAnyRecipe" @click="handleCreateShoppingList">
        🛒 Einkaufsliste aus Plan erstellen
      </button>
    </div>

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

    <AiRecipeSheet
      :isOpen="showAiModal"
      :week="weekForSheet"
      :initialDateKey="defaultSuggestDateKey"
      :suggest="suggestRecipes"
      :assign="assignWithPaywall"
      @close="showAiModal = false"
      @assigned="onAssigned"
    />

    <WeekAutopilotSheet
      :isOpen="showAutopilot"
      :week="weekForSheet"
      :plan="planWeek"
      :apply="applyWeekPlan"
      @close="showAutopilot = false"
      @applied="onWeekApplied"
    />

    <RecipeDetailModal
      :isOpen="showDetail"
      :recipe="detailRecipe"
      @close="showDetail = false"
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

/* KI-Look angelehnt an Gemini: wandernder Regenbogen-Gradient + weicher Glow. */
.suggest-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: linear-gradient(120deg, #4285f4 0%, #9b72cb 35%, #d96570 65%, #f6b73c 100%);
  background-size: 220% 220%;
  border: none;
  border-radius: var(--radius-card-lg);
  cursor: pointer;
  text-align: left;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.28) inset,
    0 6px 20px -4px rgba(155, 114, 203, 0.55),
    0 0 22px rgba(66, 133, 244, 0.35);
  animation: suggestGradientShift 6s ease-in-out infinite;
  transition: transform 0.12s ease;
}

.suggest-card:active {
  transform: scale(0.98);
}

/* Die beiden KI-Karten enger zusammenrücken — der Autopilot ist der Held. */
.autopilot-card {
  margin-bottom: 10px;
}

.plus-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.28);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.4px;
  vertical-align: middle;
  text-shadow: none;
}

@keyframes suggestGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.suggest-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.55);
}

.suggest-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.suggest-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.suggest-sub {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.88);
}

.suggest-chevron {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
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
